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
// ============================================================================

import { Pipe } from '@angular/core';
import type { PipeTransform } from '@angular/core';

/** Options for `toman` — both default to the common case. */
export interface TomanOptions {
  /** The value is in **Rial**; divide by 10 before formatting (tc 4). */
  rial?: boolean;
  /**
   * Append «تومان». Defaults to `true` (tc 3).
   *
   * Pass `false` in a table column whose header already says «مبلغ (تومان)» —
   * repeating the unit on every row is noise, and it is also what BO-B17 tc 4
   * asks for ("the unit is stated once").
   */
  unit?: boolean;
}

const NBSP = '\u00A0';

/**
 * Built once at module scope: constructing an `Intl.NumberFormat` is far more
 * expensive than formatting with one, and a table renders this pipe hundreds of
 * times per change detection pass.
 */
const GROUPED = new Intl.NumberFormat('fa-IR', {
  useGrouping: true,
  maximumFractionDigits: 0,
});

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
   * @param value Integer amount in Toman, or a numeric string from an API that
   * sends `"1250000"`. `null` / `undefined` / `''` -> `''` (tc 6); a
   * non-numeric string -> `'—'`, because a broken value should look broken
   * rather than silently become zero.
   * @param options `rial` converts from Rial; `unit` toggles the «تومان» suffix.
   */
  transform(value: number | string | null | undefined, options: TomanOptions = {}): string {
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
    const toman = Math.round(options.rial ? amount / 10 : amount);
    const text = GROUPED.format(toman);

    return options.unit === false ? text : `${text}${NBSP}تومان`;
  }
}
