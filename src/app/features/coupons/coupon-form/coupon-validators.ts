// src/app/features/coupons/coupon-form/coupon-validators.ts
//
// BO-J03's rules, pure and testable without a TestBed.
//
// Two of them are GROUP validators because they depend on a sibling control:
// the percent/amount rule on `type`, and the window order on `from`. Angular
// runs them when the group's value changes, and they write the message key onto
// the field that owns the error, so `app-form-field` and `fieldError()` keep one
// place to read from.
//
// The server repeats every rule (mock-interceptor `validateCoupon`). The client
// copy exists to answer before a round trip, not to replace the server: two
// tabs can race, and the 422 is still mapped under the field.

import type { AbstractControl, ValidationErrors } from '@angular/forms';

import type { CouponType } from '../models/coupon.model';

/** English uppercase, digits and hyphens, 3..20 — the same regex the mock uses. */
export const COUPON_CODE_PATTERN = /^[A-Z0-9-]{3,20}$/;

/** An empty code is `required`'s job; this only rejects a present-but-wrong one. */
export function couponCodeValidator(control: AbstractControl): ValidationErrors | null {
  // The input is displayed uppercase; a lowercase typed code is the same code,
  // so validate the value the form will send.
  const value = String(control.value ?? '')
    .trim()
    .toUpperCase();

  if (value === '') {
    return null;
  }

  return COUPON_CODE_PATTERN.test(value) ? null : { codePattern: true };
}

/** `1..100` for a percent coupon, `> 0` for an amount one. */
export function couponValueValidator(group: AbstractControl): ValidationErrors | null {
  const control = group.get('value');

  if (!control) {
    return null;
  }

  const type = group.get('type')?.value as CouponType;
  const value = Number(control.value);
  const errors = { ...(control.errors ?? {}) };

  delete errors['percentRange'];
  delete errors['amountPositive'];

  if (type === 'percent' && (value < 1 || value > 100)) {
    errors['percentRange'] = true;
  } else if (type === 'amount' && value <= 0) {
    errors['amountPositive'] = true;
  }

  control.setErrors(Object.keys(errors).length > 0 ? errors : null);

  return null;
}

/** The end of the window must not be before its start. */
export function couponDateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const control = group.get('to');

  if (!control) {
    return null;
  }

  const from = dateMillis(group.get('from')?.value);
  const to = dateMillis(control.value);
  const errors = { ...(control.errors ?? {}) };

  delete errors['afterFrom'];

  if (from !== null && to !== null && to < from) {
    errors['afterFrom'] = true;
  }

  control.setErrors(Object.keys(errors).length > 0 ? errors : null);

  return null;
}

/**
 * A warning, not an error: an amount coupon worth more than its minimum cart
 * still works, but it hands back more than the customer spends.
 */
export function minCartWarning(type: CouponType, value: number, minCart: number): string | null {
  if (type === 'amount' && minCart > 0 && minCart < value) {
    return 'مبلغ تخفیف از حداقل سبد بیشتر است؛ کوپن بیش از ارزش خرید تخفیف می‌دهد.';
  }

  return null;
}

/** `YYYY-MM-DD` → local millis, or `null` for an absent/unparseable value. */
function dateMillis(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime()) ? null : date.getTime();
}
