// src/app/features/products/product-create/product-validators.ts
//
// The product form's domain validators (BO-F08).
//
// WHY NOT `Validators.required` EVERYWHERE
// ----------------------------------------
// A name of three spaces is not a name. Angular's `required` only checks the
// empty string, and `minLength` counts spaces. These validators trim first, so
// «   » fails and « کیف » passes. They are plain functions, which is what lets
// the spec pin each rule without a TestBed.
//
// ERROR KEYS ARE THE CONTRACT
// ---------------------------
// The template never inspects `control.errors`; it asks `fieldError()`, which
// maps the key to a Persian sentence. `server` is the key F13 writes from
// `ApiError.fields`, so a duplicate-slug message appears under the slug field
// without a second error table.

import type { AbstractControl, ValidationErrors } from '@angular/forms';
import { formatDigits } from '@shared/pipes/persian-digits.pipe';

export const PRODUCT_NAME_MIN = 3;
export const PRODUCT_NAME_MAX = 200;
export const PRODUCT_SLUG_MAX = 80;
export const SHORT_DESCRIPTION_MAX = 160;

/** The fields that can show a validation message. */
export type ProductField =
  'name' | 'slug' | 'categoryId' | 'price' | 'stock' | 'lowStockThreshold' | 'shortDescription';

/** Persian `required` wording, one per field — "required" alone is unhelpful. */
const REQUIRED_MESSAGE: Readonly<Record<ProductField, string>> = {
  name: 'نام محصول الزامی است.',
  slug: 'نامک (slug) الزامی است.',
  categoryId: 'دسته‌بندی را انتخاب کنید.',
  price: 'قیمت را وارد کنید.',
  stock: 'موجودی را وارد کنید.',
  lowStockThreshold: 'آستانهٔ کم‌موجودی را وارد کنید.',
  shortDescription: 'توضیح کوتاه را وارد کنید.',
};

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Name: required after trimming, 3–200 characters.
 *
 * TRACE: `productNameValidator(new FormControl('  کیف  '))` → null (trimmed to
 * «کیف», length 3). `'  '` → `{ required: true }`. `'ab'` →
 * `{ minlength: { requiredLength: 3, actualLength: 2 } }`.
 */
export function productNameValidator(control: AbstractControl): ValidationErrors | null {
  const value = text(control.value);

  if (value === '') {
    return { required: true };
  }

  if (value.length < PRODUCT_NAME_MIN) {
    return { minlength: { requiredLength: PRODUCT_NAME_MIN, actualLength: value.length } };
  }

  if (value.length > PRODUCT_NAME_MAX) {
    return { maxlength: { requiredLength: PRODUCT_NAME_MAX, actualLength: value.length } };
  }

  return null;
}

/**
 * Slug: required, lowercase ASCII words joined by single hyphens, max 80.
 *
 * The regex is the same one the input hint promises, so a manual slug cannot
 * reach the server with a Persian character or a double hyphen.
 */
export function productSlugValidator(control: AbstractControl): ValidationErrors | null {
  const value = text(control.value);

  if (value === '') {
    return { required: true };
  }

  if (value.length > PRODUCT_SLUG_MAX) {
    return { maxlength: { requiredLength: PRODUCT_SLUG_MAX, actualLength: value.length } };
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    return { pattern: true };
  }

  return null;
}

/** Price: required and strictly greater than zero (zero is not a giveaway). */
export function positivePriceValidator(control: AbstractControl): ValidationErrors | null {
  if (control.value === null || control.value === undefined || control.value === '') {
    return { required: true };
  }

  const value = Number(control.value);

  if (!Number.isFinite(value)) {
    return { number: true };
  }

  return value > 0 ? null : { positive: true };
}

/** Stock/threshold: required, numeric and never negative (zero is allowed). */
export function nonNegativeNumberValidator(control: AbstractControl): ValidationErrors | null {
  if (control.value === null || control.value === undefined || control.value === '') {
    return { required: true };
  }

  const value = Number(control.value);

  if (!Number.isFinite(value)) {
    return { number: true };
  }

  return value >= 0 ? null : { negative: true };
}

/** Short description: optional, max 160 code points (not UTF-16 units). */
export function shortDescriptionValidator(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value : '';

  if (Array.from(value).length <= SHORT_DESCRIPTION_MAX) {
    return null;
  }

  return {
    maxlength: {
      requiredLength: SHORT_DESCRIPTION_MAX,
      actualLength: Array.from(value).length,
    },
  };
}

/**
 * First visible message for a field, or `null`.
 *
 * tc 9 is enforced here: a control that has not been touched shows nothing, even
 * if it is invalid. A server error wins over the local key because it is more
 * specific ("این نامک قبلاً استفاده شده است" beats "required").
 */
export function fieldError(field: ProductField, control: AbstractControl): string | null {
  if (!control.touched) {
    return null;
  }

  const errors = control.errors;

  if (!errors) {
    return null;
  }

  if (typeof errors['server'] === 'string') {
    return errors['server'];
  }

  if (errors['required']) {
    return REQUIRED_MESSAGE[field];
  }

  if (errors['positive']) {
    return 'قیمت باید بزرگ‌تر از صفر باشد.';
  }

  if (errors['negative']) {
    return 'مقدار نمی‌تواند منفی باشد.';
  }

  if (errors['number']) {
    return 'یک عدد معتبر وارد کنید.';
  }

  if (errors['pattern']) {
    return 'فقط حروف انگلیسی، عدد و خط تیره مجاز است.';
  }

  if (errors['minlength']) {
    return `حداقل ${formatDigits(errors['minlength'].requiredLength)} کاراکتر لازم است.`;
  }

  if (errors['maxlength']) {
    return `حداکثر ${formatDigits(errors['maxlength'].requiredLength)} کاراکتر مجاز است.`;
  }

  return 'مقدار واردشده معتبر نیست.';
}
