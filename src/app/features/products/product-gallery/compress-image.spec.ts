import { COMPRESSION_THRESHOLD, scaledDimensions, compressImageFile } from './compress-image';

function pngOfSize(size: number, name = 'photo.png'): File {
  return new File([new Uint8Array(size)], name, { type: 'image/png' });
}

/** Fake 2d context + canvas, and a real `createElement` for every other tag. */
function stubCanvas(toBlob: (callback: (blob: Blob | null) => void) => void): {
  context: { drawImage: ReturnType<typeof vi.fn> };
  size: () => { width: number; height: number };
  restore: () => void;
} {
  const context = { drawImage: vi.fn() };
  const box = { width: 0, height: 0 };
  const canvas = {
    get width(): number {
      return box.width;
    },
    set width(value: number) {
      box.width = value;
    },
    get height(): number {
      return box.height;
    },
    set height(value: number) {
      box.height = value;
    },
    getContext: () => context,
    toBlob,
  } as unknown as HTMLCanvasElement;

  const realCreateElement = document.createElement.bind(document);
  const spy = vi
    .spyOn(document, 'createElement')
    .mockImplementation(((tagName: string, options?: ElementCreationOptions) =>
      tagName.toLowerCase() === 'canvas'
        ? canvas
        : realCreateElement(tagName, options)) as typeof document.createElement);

  return {
    context,
    size: () => ({ ...box }),
    restore: () => spy.mockRestore(),
  };
}

describe('compress-image (BO-F11)', () => {
  describe('scaledDimensions', () => {
    it('leaves images that already fit untouched', () => {
      expect(scaledDimensions(1200, 800)).toEqual({ width: 1200, height: 800 });
      expect(scaledDimensions(1920, 1920)).toEqual({ width: 1920, height: 1920 });
    });

    it('fits a landscape photo inside the box', () => {
      expect(scaledDimensions(4000, 3000)).toEqual({ width: 1920, height: 1440 });
    });

    it('drives the scale from the LONG edge, portrait included', () => {
      expect(scaledDimensions(1080, 2400)).toEqual({ width: 864, height: 1920 });
    });

    it('honours a custom ceiling', () => {
      expect(scaledDimensions(4000, 3000, 1000)).toEqual({ width: 1000, height: 750 });
    });

    it('never divides by zero', () => {
      expect(scaledDimensions(0, 0)).toEqual({ width: 0, height: 0 });
    });
  });

  describe('compressImageFile', () => {
    it('passes a small file through unchanged (same reference)', async () => {
      const file = pngOfSize(COMPRESSION_THRESHOLD - 1);

      expect(await compressImageFile(file)).toBe(file);
    });

    it('never re-encodes a GIF — animation would be lost', async () => {
      const gif = new File([new Uint8Array(COMPRESSION_THRESHOLD + 1)], 'funny.gif', {
        type: 'image/gif',
      });

      expect(await compressImageFile(gif)).toBe(gif);
    });

    it('returns the original when no decoder exists (jsdom default)', async () => {
      // jsdom has no createImageBitmap and no 2d canvas: the graceful
      // fallback is the CONTRACT here, and this spec pins it without a
      // single stub.
      const file = pngOfSize(COMPRESSION_THRESHOLD + 1);

      expect(await compressImageFile(file)).toBe(file);
    });

    it('re-encodes a large PNG to a smaller JPEG at the ceiling', async () => {
      const file = pngOfSize(COMPRESSION_THRESHOLD + 1, 'phone-shot.png');
      const bitmap = { width: 4000, height: 3000, close: vi.fn() } as unknown as ImageBitmap;
      const canvas = stubCanvas((callback) => {
        callback(new Blob(['jpeg-bytes'], { type: 'image/jpeg' }));
      });

      const createSpy = vi.fn(() => Promise.resolve(bitmap));
      vi.stubGlobal('createImageBitmap', createSpy);

      try {
        const stored = await compressImageFile(file);

        expect(stored).not.toBe(file);
        expect(stored.name).toBe('phone-shot.jpg');
        expect(stored.type).toBe('image/jpeg');
        expect(canvas.size()).toEqual({ width: 1920, height: 1440 });
        expect(canvas.context.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 1920, 1440);
        expect(bitmap.close).toHaveBeenCalled();
        expect(createSpy).toHaveBeenCalledWith(file);
      } finally {
        vi.unstubAllGlobals();
        canvas.restore();
      }
    });

    it('keeps the original when re-encoding would GROW the file', async () => {
      const file = pngOfSize(COMPRESSION_THRESHOLD + 1);
      const bitmap = { width: 800, height: 600, close: vi.fn() } as unknown as ImageBitmap;
      const canvas = stubCanvas((callback) => {
        // 3 MB of "JPEG" from a 1 MB PNG: compression must refuse.
        callback(new Blob([new Uint8Array(COMPRESSION_THRESHOLD * 3)], { type: 'image/jpeg' }));
      });

      vi.stubGlobal(
        'createImageBitmap',
        vi.fn(() => Promise.resolve(bitmap)),
      );

      try {
        expect(await compressImageFile(file)).toBe(file);
        expect(bitmap.close).toHaveBeenCalled();
      } finally {
        vi.unstubAllGlobals();
        canvas.restore();
      }
    });
  });
});
