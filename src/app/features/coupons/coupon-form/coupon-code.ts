// src/app/features/coupons/coupon-form/coupon-code.ts
//
// The «تولید» button's generator (BO-J02 tc 3).
//
// English uppercase + digits only, because the coupon code is typed into a
// Latin checkout field and read aloud by support. I, O, 0 and 1 are excluded:
// they are the four characters people confuse when a code is dictated.
//
// `random` is a parameter so the test can pin the output; the UI passes the
// default.

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * `generateCouponCode(6, () => 0)` → `'OFF-AAAAAA'`.
 *
 * TRACE — the button:
 *   1. `generateCode()` calls this with the default `Math.random`.
 *   2. Six `Math.floor(random() * 32)` picks from `ALPHABET` (no I/O/0/1).
 *   3. The value is written to the code control and the field stays editable:
 *      the user may replace it before saving.
 */
export function generateCouponCode(length = 6, random: () => number = Math.random): string {
  let suffix = '';

  for (let index = 0; index < length; index += 1) {
    suffix += ALPHABET[Math.floor(random() * ALPHABET.length)] ?? 'X';
  }

  return `OFF-${suffix}`;
}
