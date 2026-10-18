// src/app/shared/pipes/persian-digits.pipe.ts
//
// WHAT THIS IS
// ------------
// Latin digits -> Persian digits, and nothing else.
//
//   {{ order.code | persianDigits }}      {{ '۱۴۰۴' | persianDigits }}
//
// WHY IT IS SEPARATE FROM `toman`
// -------------------------------
// `toman` already emits Persian digits, because `Intl.NumberFormat('fa-IR')`
// does. This pipe exists for the values that are NOT numbers: an order code, a
// phone number, a tracking id, a count inside a sentence. Those arrive as
// strings with Latin digits and must match the numerals around them (tc 7 of
// BO-B17: "digits are the same in every widget").
//
// WHAT IT DELIBERATELY DOES NOT DO
// --------------------------------
// No grouping, no rounding, no unit, no digit-order change. A string is mapped
// character by character, so `'سفارش 42'` becomes `'سفارش ۴۲'` and the word
// survives. Anything that needs a separator is a number and belongs in `toman`.
// ============================================================================

import { Pipe } from '@angular/core';
import type { PipeTransform } from '@angular/core';

/** Index IS the Latin digit: DIGITS[7] === '۷'. */
const DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Rewrites every Latin digit in a value as its Persian counterpart.
 *
 * @example
 * ```html
 * <span>{{ 'کد سفارش 1042' | persianDigits }}</span>   <!-- کد سفارش ۱۰۴۲ -->
 * <span>{{ 0 | persianDigits }}</span>                 <!-- ۰ -->
 * ```
 */
@Pipe({ name: 'persianDigits' })
export class PersianDigitsPipe implements PipeTransform {
  /**
   * @param value Any string or number. `null` / `undefined` -> `''` (tc 6), so a
   * missing value renders nothing rather than the word "null".
   */
  transform(value: string | number | null | undefined): string {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value).replace(/[0-9]/g, (digit) => DIGITS[Number(digit)]);
  }
}
