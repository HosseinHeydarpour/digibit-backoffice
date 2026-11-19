// src/app/features/banners/banner-form/banner-image.ts
//
// The banner image contract (BO-L02), pure so the spec needs no DOM.
//
// The server re-validates; this copy exists to refuse a 12 MB TIFF before it
// crosses the wire. The preview box's aspect ratio follows the POSITION: a
// header strip and a square sidebar are not interchangeable.

import type { BannerPosition } from '@shared/models';

export const BANNER_IMAGE_TYPES: readonly string[] = ['image/png', 'image/jpeg', 'image/webp'];
export const BANNER_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/** The sentence to show, or null when the file is acceptable. */
export function validateBannerImage(file: File): string | null {
  if (!BANNER_IMAGE_TYPES.includes(file.type)) {
    return 'فقط تصویر PNG، JPG یا WebP مجاز است.';
  }

  if (file.size > BANNER_IMAGE_MAX_BYTES) {
    return 'حجم تصویر نباید بیشتر از ۲ مگابایت باشد.';
  }

  return null;
}

/** The suggested preview ratio for a slot (also printed as a hint). */
export function bannerAspectClass(position: BannerPosition): string {
  switch (position) {
    case 'home-top':
      return 'aspect-[16/4]';
    case 'home-middle':
      return 'aspect-[16/6]';
    case 'sidebar':
      return 'aspect-square';
  }
}

/** The same ratios as a sentence, for the field hint. */
export function bannerAspectLabel(position: BannerPosition): string {
  switch (position) {
    case 'home-top':
      return 'نسبت پیشنهادی ۱۶:۴';
    case 'home-middle':
      return 'نسبت پیشنهادی ۱۶:۶';
    case 'sidebar':
      return 'نسبت پیشنهادی ۱:۱';
  }
}
