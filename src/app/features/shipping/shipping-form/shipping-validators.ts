// src/app/features/shipping/shipping-form/shipping-validators.ts
//
// BO-K06's rules, pure and testable without a TestBed.
//
// The day-window and free-threshold rules depend on a sibling control, so they
// are GROUP validators that write their key onto the field that owns the error,
// exactly like the coupon rules. `app-form-field` and `fieldError()` then keep
// one place to read.

import type { AbstractControl, ValidationErrors } from '@angular/forms';

export const SHIPPING_NAME_MIN = 3;
export const SHIPPING_NAME_MAX = 40;
export const SHIPPING_DAYS_MAX = 30;

/** A present-but-wrong name; an empty one is `required`'s job. */
export function shippingNameValidator(control: AbstractControl): ValidationErrors | null {
  const name = String(control.value ?? '').trim();

  if (name === '') {
    return null;
  }

  if (name.length < SHIPPING_NAME_MIN) {
    return { nameShort: true };
  }

  return name.length > SHIPPING_NAME_MAX ? { nameLong: true } : null;
}

/** The window's two ends must be sane and ordered. */
export function shippingDaysValidator(group: AbstractControl): ValidationErrors | null {
  const minControl = group.get('minDays');
  const maxControl = group.get('maxDays');

  if (!minControl || !maxControl) {
    return null;
  }

  const min = Number(minControl.value);
  const max = Number(maxControl.value);
  const minBad = !Number.isFinite(min) || min < 1 || min > SHIPPING_DAYS_MAX;
  const maxBad = !Number.isFinite(max) || max > SHIPPING_DAYS_MAX || (!minBad && max < min);

  setFieldError(minControl, 'minDaysError', minBad);
  setFieldError(maxControl, 'maxDaysError', maxBad);

  return null;
}

/** `null` means no threshold; a negative number is a typo, not a state. */
export function shippingFreeFromValidator(group: AbstractControl): ValidationErrors | null {
  const control = group.get('freeFrom');

  if (!control) {
    return null;
  }

  const value = control.value;
  const negative = value !== null && value !== '' && Number(value) < 0;

  setFieldError(control, 'freeFromNegative', negative);

  return null;
}

/**
 * A warning, not an error: a free threshold below the base cost means every
 * order pays more to ship than the shopper is told. Still legal, worth a note.
 */
export function freeFromWarning(cost: number, freeFrom: number | null): string | null {
  if (freeFrom !== null && freeFrom > 0 && freeFrom < cost) {
    return 'آستانهٔ ارسال رایگان از هزینهٔ روش کمتر است؛ عملاً هیچ سفارشی رایگان نمی‌شود.';
  }

  return null;
}

/** Add or clear one key without dropping the other validators' keys. */
function setFieldError(control: AbstractControl, key: string, invalid: boolean): void {
  const errors = { ...(control.errors ?? {}) };

  delete errors[key];

  if (invalid) {
    errors[key] = true;
  }

  control.setErrors(Object.keys(errors).length > 0 ? errors : null);
}
