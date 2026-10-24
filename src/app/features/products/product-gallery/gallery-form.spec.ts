import { FormBuilder } from '@angular/forms';
import type { FormArray, FormGroup } from '@angular/forms';

import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGES,
  MAX_IMAGE_SIZE,
  altFor,
  createImageArray,
  createImageGroup,
  imageFileErrorMessage,
  imageFiles,
  imagesPayload,
  moveImage,
  removeImage,
  revokeImageUrl,
  setPrimaryImage,
  validateImageFile,
} from './gallery-form';

const fb = new FormBuilder();

function png(name = 'a.png', size = 100): File {
  return new File([new Uint8Array(size)], name, { type: 'image/png' });
}

function seedImages(count: number, primaryIndex = 0): FormArray<FormGroup> {
  const images = createImageArray(fb);

  for (let index = 0; index < count; index += 1) {
    images.push(
      createImageGroup(fb, {
        url: `blob:img-${index + 1}`,
        alt: `تصویر ${index + 1}`,
        isPrimary: index === primaryIndex,
      }),
    );
  }

  return images;
}

describe('gallery-form (BO-F11)', () => {
  describe('constants', () => {
    it('quotes the Arino hint: 5 images, 2 MB, PNG/JPG/GIF', () => {
      expect(MAX_IMAGES).toBe(5);
      expect(MAX_IMAGE_SIZE).toBe(2 * 1024 * 1024);
      expect(ACCEPTED_IMAGE_TYPES).toEqual(['image/png', 'image/jpeg', 'image/gif']);
    });
  });

  describe('createImageGroup', () => {
    it('builds an empty row with a required url', () => {
      const group = createImageGroup(fb);

      expect(group.value).toEqual({ url: '', alt: '', isPrimary: false, file: null });
      expect(group.get('url')?.hasError('required')).toBe(true);
    });

    it('prefers every seeded value', () => {
      const file = png();
      const group = createImageGroup(fb, {
        url: 'blob:x',
        alt: 'کاور',
        isPrimary: true,
        file,
      });

      expect(group.value).toEqual({ url: 'blob:x', alt: 'کاور', isPrimary: true, file });
      expect(group.valid).toBe(true);
    });
  });

  describe('validateImageFile', () => {
    it('accepts every listed type', () => {
      for (const type of ['image/png', 'image/jpeg', 'image/gif']) {
        expect(validateImageFile(new File([new Uint8Array(1)], 'f', { type }))).toBeNull();
      }
    });

    it('rejects a non-image (tc 5), reporting type before size', () => {
      const exe = new File([new Uint8Array(MAX_IMAGE_SIZE + 1)], 'virus.exe', {
        type: 'application/octet-stream',
      });

      expect(validateImageFile(exe)).toBe('type');
    });

    it('rejects a file without a type (fails closed)', () => {
      const unknown = new File([new Uint8Array(1)], 'mystery');

      expect(validateImageFile(unknown)).toBe('type');
    });

    it('rejects a file over 2 MB (tc 6)', () => {
      const big = new File([new Uint8Array(MAX_IMAGE_SIZE + 1)], 'big.png', { type: 'image/png' });

      expect(validateImageFile(big)).toBe('size');
    });

    it('accepts a file exactly at the limit', () => {
      const atLimit = new File([new Uint8Array(MAX_IMAGE_SIZE)], 'edge.png', {
        type: 'image/png',
      });

      expect(validateImageFile(atLimit)).toBeNull();
    });
  });

  describe('imageFileErrorMessage', () => {
    it('names the file in both sentences', () => {
      const file = png('عکس-زمینه.png');

      expect(imageFileErrorMessage(file, 'type')).toContain('عکس-زمینه.png');
      expect(imageFileErrorMessage(file, 'size')).toContain('عکس-زمینه.png');
      expect(imageFileErrorMessage(file, 'size')).toContain('۲ مگابایت');
    });
  });

  describe('altFor', () => {
    it('combines the product name with a Persian position', () => {
      expect(altFor('هدفون سونی', 2)).toBe('هدفون سونی - تصویر ۲');
    });

    it('falls back to the bare position and trims the name', () => {
      expect(altFor('', 1)).toBe('تصویر ۱');
      expect(altFor('   ', 3)).toBe('تصویر ۳');
    });
  });

  describe('moveImage', () => {
    it('moves the group object, carrying isPrimary with it (tc 3/4)', () => {
      const images = seedImages(3, 0);

      expect(moveImage(images, 0, 2)).toBe(true);
      expect(images.at(2).get('url')?.value).toBe('blob:img-1');
      expect(images.at(2).get('isPrimary')?.value).toBe(true);
      expect(images.at(0).get('url')?.value).toBe('blob:img-2');
    });

    it('refuses out-of-range and no-op moves without touching the array', () => {
      const images = seedImages(2);

      expect(moveImage(images, -1, 0)).toBe(false);
      expect(moveImage(images, 0, 2)).toBe(false);
      expect(moveImage(images, 1, 1)).toBe(false);
      expect(images.at(0).get('url')?.value).toBe('blob:img-1');
    });
  });

  describe('setPrimaryImage', () => {
    it('leaves exactly one primary behind', () => {
      const images = seedImages(3, 0);

      setPrimaryImage(images, 2);

      expect(images.controls.map((group) => group.get('isPrimary')?.value)).toEqual([
        false,
        false,
        true,
      ]);
    });

    it('is a no-op for an unknown index', () => {
      const images = seedImages(2, 1);

      setPrimaryImage(images, 9);

      expect(images.at(1).get('isPrimary')?.value).toBe(true);
    });
  });

  describe('removeImage', () => {
    it('removes a non-primary row and keeps the cover (tc 2)', () => {
      const images = seedImages(3, 0);

      expect(removeImage(images, 2)).toBe(true);
      expect(images.length).toBe(2);
      expect(images.at(0).get('isPrimary')?.value).toBe(true);
    });

    it('promotes the first survivor when the cover is removed (tc 4)', () => {
      const images = seedImages(3, 1);

      removeImage(images, 1);

      expect(images.length).toBe(2);
      expect(images.at(0).get('isPrimary')?.value).toBe(true);
      expect(images.at(1).get('isPrimary')?.value).toBe(false);
    });

    it('is a no-op for an unknown index', () => {
      const images = seedImages(2);

      expect(removeImage(images, 5)).toBe(false);
      expect(images.length).toBe(2);
    });

    it('allows the array to reach zero rows', () => {
      const images = seedImages(1);

      removeImage(images, 0);

      expect(images.length).toBe(0);
    });
  });

  describe('revokeImageUrl', () => {
    it('revokes only blob: URLs', () => {
      // jsdom does not implement revokeObjectURL, so the spec installs its own
      // and restores whatever was there (possibly nothing).
      const originalRevoke = URL.revokeObjectURL;
      const revoke = vi.fn();
      URL.revokeObjectURL = revoke as typeof URL.revokeObjectURL;

      try {
        const session = createImageGroup(fb, { url: 'blob:mine' });
        const server = createImageGroup(fb, { url: 'https://cdn.example.com/a.jpg' });

        revokeImageUrl(server);
        expect(revoke).not.toHaveBeenCalled();

        revokeImageUrl(session);
        expect(revoke).toHaveBeenCalledWith('blob:mine');
      } finally {
        URL.revokeObjectURL = originalRevoke;
      }
    });
  });

  describe('imagesPayload', () => {
    it('maps every row to the DTO shape with a stable order (F13 boundary)', () => {
      const images = seedImages(2, 1);
      images.at(1).get('alt')?.setValue('  کاور اصلی  ');

      expect(imagesPayload(images)).toEqual([
        { url: 'blob:img-1', alt: 'تصویر 1', isPrimary: false, order: 0 },
        { url: 'blob:img-2', alt: 'کاور اصلی', isPrimary: true, order: 1 },
      ]);
    });

    it('skips rows without a url and never exports the File', () => {
      const images = seedImages(1);
      images.push(createImageGroup(fb, { url: '' }));

      const payload = imagesPayload(images);

      expect(payload.length).toBe(1);
      expect(Object.keys(payload[0])).toEqual(['url', 'alt', 'isPrimary', 'order']);
    });
  });

  describe('imageFiles', () => {
    it('returns only the rows that carry a File', () => {
      const file = png();
      const images = seedImages(1);
      images.push(createImageGroup(fb, { url: 'https://cdn.example.com/b.jpg' }));
      images.push(createImageGroup(fb, { url: 'blob:two', file }));

      expect(imageFiles(images)).toEqual([file]);
    });
  });
});
