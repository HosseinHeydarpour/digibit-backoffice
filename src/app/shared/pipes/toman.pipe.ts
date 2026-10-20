// src/app/shared/pipes/toman.pipe.ts
//
// WHAT THIS IS
// ------------
// An integer amount -> grouped Persian digits + the unit.
//
//   {{ product.price | toman }}                    ۱٬۲۵۰٬۰۰۰ تومان
//   {{ product.price | toman: { rial: true } }}    the API sent Rial, not Toman
//   {{ product.price | toman: { unit: false } }}   no unit — the header says it
//
// WHY A FUNCTION *AND* A PIPE
// ---------------------------
// A pipe can only be used from a template. The sales chart builds its tick
// labels and its tooltip strings in TypeScript, and it used to call
// `toLocaleString('fa-IR')` on its own — a second formatter that could drift
// from this one (BO-E06 tc 1, tc 7). `formatToman` is the real implementation;
// the pipe is a two-line wrapper around it, so the template and the chart
// cannot produce two different renderings of the same number.
//
// WHY `Intl` AND NOT A HAND-WRITTEN REGEX
// ---------------------------------------
// The grouping separator for `fa-IR` is U+066C (٬ ARABIC THOUSANDS SEPARATOR),
// not the Latin comma and not U+060C. Hard-coding `,` is the single most common
// way a Persian number ends up looking subtly wrong next to real Persian text,
// and `Intl` gets it right in every runtime this app targets. It also emits the
// Persian digits for free, which is why `toman` never needs `persianDigits`.
//
// THE NEGATIVE CASE KEEPS ITS INVISIBLE MARK
// ------------------------------------------
// `format(-45000)` returns U+200E (LRM) + U+2212 (−) + the digits. The LRM is
// not noise: it pins the number to a left-to-right run so the minus stays on the
// LEFT of the digits inside an RTL paragraph. Stripping it makes a negative
// price render as `۴۵٬۰۰۰−` in some browsers. So the mark stays, and the spec
// asserts a SUBSTRING rather than a whole-string equality to avoid pinning an
// invisible character.
//
// WHY THE UNIT IS JOINED WITH A NO-BREAK SPACE
// --------------------------------------------
// `1250000 تومان` can wrap between the number and the word, leaving «تومان»
// alone on the next line in a narrow table cell. `\u00A0` keeps the pair
// together, which is the cheapest half of tc 12 (no overflow on mobile).
//
// TRACE / PRACTICAL USAGE EXAMPLE
// -------------------------------
// The orders table prints `{{ order.total | toman }}`, and the API sends Rial.
// Take one row — `order.total = 12_500_000` (Rial) — and the chart's axis,
// which asks for millions with no unit:
//
// 1. TEMPLATE — `{{ order.total | toman: { rial: true } }}` calls
//    `TomanPipe.transform(12500000, { rial: true })`.
//
// 2. GUARD — `12500000` is neither `null`, `undefined` nor `''`, and
//    `Number.isFinite(12500000)` is true, so the function continues. (`''`
//    would have returned `''`, and `'abc'` would have returned `'—'` — a broken
//    value must look broken, not look like zero.)
//
// 3. RIAL -> TOMAN — `options.rial` is true, so `toman = 12500000 / 10 =
//    1250000`. The division happens BEFORE formatting, so the grouped digits
//    are already Toman and nothing has to strip a trailing zero afterwards.
//
// 4. FORMATTER — `grouped(options.fractionDigits ?? 0)` is `grouped(0)`. The
//    `FORMATTERS` map has no entry for `0` on the first call, so one
//    `Intl.NumberFormat('fa-IR', { useGrouping: true, maximumFractionDigits: 0 })`
//    is built and stored under the key `0`. Every later price in the same table
//    reuses it — that is the whole reason the map exists, since a 50-row table
//    formats 50 times per change detection pass.
//
// 5. `.format(1250000)` -> `'۱٬۲۵۰٬۰۰۰'`. `Intl` supplies BOTH the Persian
//    digits and the U+066C separator; nothing in this file touches either.
//
// 6. UNIT — `options.unit` is `undefined`, not `false`, so the branch appends
//    `NO_BREAK_SPACE + TOMAN_UNIT` -> `'۱٬۲۵۰٬۰۰۰\u00A0تومان'`.
//
// 7. The chart's right-hand axis instead calls
//    `formatToman(35000000 / 1e6, { unit: false })` -> `grouped(0).format(35)`
//    -> `'۳۵'`, with no unit because the axis title already says
//    «درآمد (میلیون تومان)». Same function, same formatter cache, one rendering
//    rule for the whole app.
// ============================================================================

import { Pipe } from '@angular/core';
import type { PipeTransform } from '@angular/core';

/**
 * The one place the currency is spelled (BO-E06 tc 4).
 *
 * Every widget that prints a price — the KPI tile's `unit` input, the chart's
 * tooltip and its right-hand axis title, the `toman` pipe itself — reads this
 * constant. It used to be the literal «تومان» in four files, which is how a
 * panel ends up with «تومان» on one card and «ریال» on the next after somebody
 * edits one of them.
 */
export const TOMAN_UNIT = 'تومان';

/** `U+00A0` — keeps a number and its unit on the same line. */
export const NO_BREAK_SPACE = '\u00A0';

/** Options for `toman` / `formatToman` — all default to the common case. */
export interface TomanOptions {
  /** The value is in **Rial**; divide by 10 before formatting (tc 4). */
  rial?: boolean;
  /**
   * Append «تومان». Defaults to `true` (tc 3).
   *
   * Pass `false` in a table column whose header already says «مبلغ (تومان)» —
   * repeating the unit on every row is noise, and it is also what BO-B17 tc 4
   * asks for ("the unit is stated once"). The chart's right-hand axis uses it
   * too, because its title already carries the unit.
   */
  unit?: boolean;
  /**
   * Digits after the decimal point. Defaults to `0` — Toman has no minor unit
   * (ARCHITECTURE.md §8-2).
   *
   * Only the chart's "millions" axis asks for anything else, and even that
   * passes `0`; the option exists so a future percentage-style axis does not
   * need a fourth formatter.
   */
  fractionDigits?: number;
}

/**
 * One `Intl.NumberFormat` per fraction-digit count, built on first use.
 *
 * Constructing a formatter is far more expensive than formatting with one, and
 * a table renders this pipe hundreds of times per change detection pass.
 */
const FORMATTERS = new Map<number, Intl.NumberFormat>();

function grouped(digits: number): Intl.NumberFormat {
  let formatter = FORMATTERS.get(digits);

  if (!formatter) {
    formatter = new Intl.NumberFormat('fa-IR', {
      useGrouping: true,
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    });
    FORMATTERS.set(digits, formatter);
  }

  return formatter;
}

/**
 * Formats an integer amount as Toman, with grouping and Persian digits.
 *
 * This is the ONLY money formatter in the app (BO-E06 tc 1): the `toman` pipe
 * delegates here, and so does the sales chart. `Intl` already emits Persian
 * digits and the U+066C separator, so nothing else may post-process the result.
 *
 * @example
 * ```ts
 * formatToman(1250000)                          // '۱٬۲۵۰٬۰۰۰\u00A0تومان'
 * formatToman(1250000, { unit: false })         // '۱٬۲۵۰٬۰۰۰'
 * formatToman(12500000, { rial: true })         // '۱٬۲۵۰٬۰۰۰\u00A0تومان'
 * formatToman(35000000 / 1_000_000, { unit: false }) // '۳۵'  ← chart axis
 * ```
 *
 * @param value Integer amount in Toman, or a numeric string from an API that
 * sends `"1250000"`. `null` / `undefined` / `''` -> `''` (tc 6); a non-numeric
 * string -> `'—'`, because a broken value should look broken rather than
 * silently become zero.
 * @param options `rial` converts from Rial; `unit` toggles the suffix;
 * `fractionDigits` sets the decimal places.
 */
export function formatToman(
  value: number | string | null | undefined,
  options: TomanOptions = {},
): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount)) {
    return '—';
  }

  // Rial -> Toman, then round: the architecture stores an integer without
  // decimals (ARCHITECTURE.md §8-2), so a half-Toman from an odd Rial amount
  // must land on a whole number rather than print as 0.5.
  const toman = options.rial ? amount / 10 : amount;
  const text = grouped(options.fractionDigits ?? 0).format(toman);

  return options.unit === false ? text : `${text}${NO_BREAK_SPACE}${TOMAN_UNIT}`;
}

/**
 * Formats an integer amount as Toman, with grouping and Persian digits.
 *
 * @example
 * ```html
 * <span>{{ 1250000 | toman }}</span>                      <!-- ۱٬۲۵۰٬۰۰۰ تومان -->
 * <span>{{ 12500000 | toman: { rial: true } }}</span>    <!-- ۱٬۲۵۰٬۰۰۰ تومان -->
 * <span>{{ total | toman: { unit: false } }}</span>       <!-- ۱٬۲۵۰٬۰۰۰ -->
 * ```
 */
@Pipe({ name: 'toman' })
export class TomanPipe implements PipeTransform {
  /**
   * @param value Integer amount in Toman, or a numeric string from the API.
   * @param options `rial` converts from Rial; `unit` toggles «تومان».
   */
  transform(value: number | string | null | undefined, options: TomanOptions = {}): string {
    return formatToman(value, options);
  }
}
