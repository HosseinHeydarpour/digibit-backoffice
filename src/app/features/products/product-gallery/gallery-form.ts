// src/app/features/products/product-gallery/gallery-form.ts
//
// The gallery uploader's data layer (BO-F11).
//
// WHY FACTORIES HERE, LIKE variant-form.ts
// ----------------------------------------
// Three places build an image row: the primary dropzone, the gallery dropzone,
// and — from BO-F14 — the edit page that hydrates a saved gallery. If each wrote
// its own `fb.group({...})`, the three shapes would drift. `createImageGroup` is
// the single definition of a row, and the pure spec can assert the shape without
// a TestBed.
//
// WHY THE ROW KEEPS THE `File`
// ----------------------------
// The task note is explicit: until the product exists, the images live in
// memory and `PATCH /products/{id}/images` happens afterwards. That upload needs
// the actual file, so the row stores it next to its preview URL. `file` is
// deliberately NOT part of `imagesPayload()` — it is UI-side state for F13's
// FormData, never an API field.
//
// WHY THE URL IS AN OBJECT URL AND NOT A data URL
// -----------------------------------------------
// `URL.createObjectURL` is a pointer to the blob; `FileReader.readAsDataURL`
// base64-encodes the whole image into a string held twice in memory. A 2 MB
// photo becomes ~2.7 MB of string with the data-URL path, and every preview
// re-render pays for it. The object URL costs a short string and is released
// with `revokeObjectURL`.
//
// WHY THE URL IS REVOKED ONLY FOR `blob:` STRINGS
// -----------------------------------------------
// BO-F14 seeds rows from `GET /products/:id`, whose URLs are ordinary
// `https://…` addresses. Revoking one of those would break every other browser
// tab that shares it. The `blob:` prefix is what tells "I own this" from
// "the server owns this".

import { FormArray, FormBuilder, Validators } from '@angular/forms';
import type { AbstractControl, FormGroup } from '@angular/forms';
import { formatDigits } from '@shared/pipes/persian-digits.pipe';

import type { ProductImageInput } from '../models/product.model';

/**
 * A hard ceiling taken from the Arino form's own hint («حداکثر 5 تصویر»).
 *
 * It is exported so the dropzone hint, the ceiling message and the spec all
 * quote the same value — the same one-number rule as `MAX_VARIANTS`.
 */
export const MAX_IMAGES = 5;

/**
 * 2 MB, matching the Arino hint («PNG, JPG, GIF تا 2MB»).
 *
 * A server limit the UI invents itself would be a lie; this one is the number
 * the reference design already promises the user.
 */
export const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

/**
 * The MIME types the dropzones accept, in the same order as the Arino hint.
 *
 * An empty `file.type` (some OSes report none) fails this check on purpose:
 * a file the browser cannot type is a file we cannot promise is an image.
 */
export const ACCEPTED_IMAGE_TYPES: readonly string[] = ['image/png', 'image/jpeg', 'image/gif'];

/** The values a row can be seeded with (the add paths and BO-F14's hydration). */
export interface ImageSeed {
  readonly url?: string;
  readonly alt?: string;
  readonly isPrimary?: boolean;
  /** The file behind `url`; present only for rows added this session. */
  readonly file?: File | null;
}

/**
 * One gallery image row.
 *
 * TRACE: `createImageGroup(fb, { url: 'blob:mock-1', alt: 'هدفون سونی - تصویر ۱', isPrimary: true, file })`
 * produces a group whose value is
 * `{ url: 'blob:mock-1', alt: '…', isPrimary: true, file: File }` and whose
 * `url` control carries `Validators.required` — a row without a URL is a bug,
 * not a state the user can reach.
 */
export function createImageGroup(fb: FormBuilder, seed: ImageSeed = {}): FormGroup {
  return fb.nonNullable.group({
    url: [seed.url ?? '', Validators.required],
    alt: [seed.alt ?? ''],
    isPrimary: [seed.isPrimary ?? false],
    file: [seed.file ?? null],
  });
}

/** The empty array the product form stores under `images`. */
export function createImageArray(fb: FormBuilder): FormArray<FormGroup> {
  return fb.array<FormGroup>([]);
}

/** Why `validateImageFile` rejected a file. `null` means "accepted". */
export type ImageFileError = 'type' | 'size';

/**
 * The type/size gate every file passes before it becomes a row (tc 5/6).
 *
 * Order matters and is deliberate: a non-image that is ALSO too large is
 * reported as a type problem, because «این فایل اصلاً تصویر نیست» is the more
 * useful sentence for someone who dragged the wrong file in.
 */
export function validateImageFile(file: File): ImageFileError | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'type';
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return 'size';
  }

  return null;
}

/** The Persian sentence for one rejected file — the message lives with the rule. */
export function imageFileErrorMessage(file: File, error: ImageFileError): string {
  if (error === 'type') {
    return `«${file.name}» یک تصویر PNG، JPG یا GIF نیست.`;
  }

  return `حجم «${file.name}» بیشتر از ۲ مگابایت است.`;
}

/**
 * The default alt text for an image (tc 11).
 *
 * TRACE: `altFor('هدفون سونی', 2)` → `'هدفون سونی - تصویر ۲'`; with no product
 * name yet, `'تصویر ۲'`. The name is trimmed so a name of spaces does not
 * produce `' - تصویر ۲'`. Position is 1-based because that is what a human
 * counting thumbnails means.
 */
export function altFor(productName: string, position: number): string {
  const name = productName.trim();
  const suffix = `تصویر ${formatDigits(position)}`;

  return name === '' ? suffix : `${name} - ${suffix}`;
}

/**
 * Move a row from `from` to `to` (buttons and drag both land here).
 *
 * TRACE: `moveImage(images, 2, 0)` on [A, B, C] produces [C, A, B] — the group
 * OBJECT moves, so its `isPrimary` flag travels with it: featuring a picture
 * and then reordering must not change which one is the cover (tc 3/4).
 *
 * Out-of-range or equal indexes return `false` and touch nothing; the callers
 * are UI events, and a UI event must not be able to corrupt the array by
 * firing twice.
 */
export function moveImage(images: FormArray, from: number, to: number): boolean {
  const count = images.length;

  if (from < 0 || from >= count || to < 0 || to >= count || from === to) {
    return false;
  }

  const group = images.at(from);
  images.removeAt(from);
  images.insert(to, group);

  return true;
}

/**
 * Make row `index` the only primary image.
 *
 * Setting a flag true without clearing the previous one would give the payload
 * two covers, and the server would have to guess. Unknown indexes are a no-op
 * for the same reason as `moveImage`.
 */
export function setPrimaryImage(images: FormArray, index: number): void {
  const target = images.at(index);

  if (!target) {
    return;
  }

  images.controls.forEach((group, current) => {
    group.get('isPrimary')?.setValue(current === index);
  });
}

/**
 * Remove a row, and if it was the cover, promote the first survivor.
 *
 * TRACE: [A(primary), B, C] → remove 0 → [B(primary), C]. A gallery with rows
 * but no cover is a state no other code should have to handle; promoting in
 * place keeps «exactly one primary whenever the array is non-empty» true after
 * every mutation, not just the happy ones.
 */
export function removeImage(images: FormArray, index: number): boolean {
  const group = images.at(index);

  if (!group) {
    return false;
  }

  const wasPrimary = group.get('isPrimary')?.value === true;
  images.removeAt(index);

  if (wasPrimary && images.length > 0) {
    setPrimaryImage(images, 0);
  }

  return true;
}

/**
 * Release the object URL of one row — but only rows this session created.
 *
 * `blob:` is the marker: a row hydrated by BO-F14 carries a server URL, and
 * `URL.revokeObjectURL` on that would be meaningless at best. Safe to call
 * twice; revoking a dead URL is a no-op.
 */
export function revokeImageUrl(group: AbstractControl): void {
  const url = group.get('url')?.value;

  if (typeof url === 'string' && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

/**
 * Every row → the shape `CreateProductDto.images` accepts (BO-F13 consumes
 * this, the way it consumes `variantsPayload()`).
 *
 * Rows with an empty URL are skipped: a half-built row is UI, not data. `file`
 * is dropped here on purpose — the payload speaks URLs, F13's FormData speaks
 * files, and `imageFiles()` is the other half of that seam.
 */
export function imagesPayload(images: FormArray): readonly ProductImageInput[] {
  const payload: ProductImageInput[] = [];

  images.controls.forEach((group, index) => {
    const url = text(group.get('url')?.value);

    if (url === '') {
      return;
    }

    payload.push({
      url,
      alt: text(group.get('alt')?.value),
      isPrimary: group.get('isPrimary')?.value === true,
      order: index,
    });
  });

  return payload;
}

/**
 * The files behind the rows, in row order (BO-F13's upload boundary).
 *
 * `instanceof File` rather than a truthiness check: the seeded rows of BO-F14
 * have no file, and reading `null` out of their `file` control must not put a
 * falsy slot into the FormData.
 */
export function imageFiles(images: FormArray): File[] {
  const files: File[] = [];

  for (const group of images.controls) {
    const file = group.get('file')?.value;

    if (file instanceof File) {
      files.push(file);
    }
  }

  return files;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
