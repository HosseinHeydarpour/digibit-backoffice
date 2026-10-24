// src/app/features/products/product-gallery/compress-image.ts
//
// Best-effort client-side compression for large images (BO-F11).
//
// WHY CLIENT-SIDE AT ALL
// ----------------------
// The task's implementation note asks for it: the gallery is held in memory
// until the product exists, and the eventual `PATCH /products/{id}/images`
// uploads every file it is given. Shrinking a 4000×3000 phone photo to 1920px
// before it ever leaves the machine cuts that payload by an order of magnitude
// and keeps the panel snappy on mobile data.
//
// WHY "BEST-EFFORT" AND NOT A HARD STEP
// -------------------------------------
// Compression can fail for reasons the UI cannot control: the browser may not
// support `createImageBitmap`, the canvas may be unavailable, the decoded
// image may be corrupt. Every failure path therefore returns the ORIGINAL
// file. An upload that proceeds with a 2 MB file is better than a gallery
// that refuses to open because a codec was missing — the 2 MB limit still
// guards the worst case.
//
// WHY GIF IS EXEMPT
// -----------------
// Canvas draws ONE frame. Re-encoding an animated GIF through a canvas
// produces a static JPEG while the file name still says .gif — a silent data
// change. GIFs are also small in practice, so skipping them costs nothing.
//
// WHY THE PURE HELPER IS A SEPARATE EXPORT
// ----------------------------------------
// `scaledDimensions` is the only part with real logic (aspect-ratio math), and
// it can be pinned without stubbing a single browser API. The IO around it
// (decode → draw → encode) is browser-only code; a spec that faked all three
// would be testing the fakes, so the spec only pins the fallback paths and the
// geometry.

/**
 * Files at or below this size are stored as-is. 1 MB images are already
 * fine to upload twice; recompressing them costs quality for no real gain.
 */
export const COMPRESSION_THRESHOLD = 1024 * 1024;

/** The longest edge any stored image may have, following common CDN practice. */
export const MAX_IMAGE_DIMENSION = 1920;

/** JPEG quality for the re-encode. 0.82 is the classic "visually lossless" point. */
export const JPEG_QUALITY = 0.82;

/** The width/height a stored image should have. */
export interface ImageDimensions {
  readonly width: number;
  readonly height: number;
}

/**
 * Fit `width × height` inside `maxDimension`, keeping the aspect ratio.
 *
 * TRACE: `scaledDimensions(4000, 3000)` → `{ width: 1920, height: 1440 }`;
 * `scaledDimensions(1080, 2400)` → `{ width: 864, height: 1920 }` (the LONG
 * edge drives the scale, portrait included); anything already inside the box
 * — `scaledDimensions(1200, 800)` → `{ width: 1200, height: 800 }` — comes
 * back unchanged, so an upscale never happens. A zero edge would divide by
 * zero; it is returned as-is because the decode step cannot produce it.
 */
export function scaledDimensions(
  width: number,
  height: number,
  maxDimension: number = MAX_IMAGE_DIMENSION,
): ImageDimensions {
  const largest = Math.max(width, height);

  if (largest <= maxDimension || largest === 0) {
    return { width, height };
  }

  const ratio = maxDimension / largest;

  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

/**
 * Return a (possibly) smaller copy of `file`, or `file` itself.
 *
 * The chain of guards, in order:
 *   1. small file → nothing to gain;
 *   2. GIF → animation would be lost;
 *   3. no `createImageBitmap` → cannot decode without blocking the main thread;
 *   4. decode throws → corrupt or unsupported file;
 *   5. no 2d context → canvas unavailable (jsdom, hardened browsers);
 *   6. encode fails or grows the file → the "compression" was a loss.
 * Every guard returns the input file, so the caller needs exactly one line:
 * `const stored = await compressImageFile(file);`
 */
export async function compressImageFile(file: File): Promise<File> {
  if (file.size <= COMPRESSION_THRESHOLD || file.type === 'image/gif') {
    return file;
  }

  if (typeof createImageBitmap !== 'function') {
    return file;
  }

  const bitmap = await createImageBitmap(file).catch(() => null);

  if (!bitmap) {
    return file;
  }

  try {
    const dimensions = scaledDimensions(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext('2d');

    if (!context) {
      return file;
    }

    context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);

    const blob = await toJpegBlob(canvas);

    if (!blob || blob.size >= file.size) {
      return file;
    }

    return new File([blob], jpegName(file.name), { type: 'image/jpeg' });
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}

/** Wrap `canvas.toBlob`'s callback style into a promise. */
function toJpegBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', JPEG_QUALITY);
  });
}

/**
 * Rename `photo.png` → `photo.jpg` so the extension matches the new MIME.
 * A file with no known extension just gets `.jpg` appended.
 */
function jpegName(name: string): string {
  return `${name.replace(/\.(png|jpe?g)$/i, '')}.jpg`;
}
