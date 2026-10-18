// src/app/shared/pipes/persian-date.pipe.ts
//
// WHAT THIS IS
// ------------
// A Gregorian value -> a Jalali string, via `Intl` (never a hand-rolled
// conversion, which is what the task asks for and what `jalali-ts` is kept out
// of the display layer for).
//
//   {{ order.createdAt | persianDate }}           ۱۴۰۴/۰۷/۰۱
//   {{ order.createdAt | persianDate: 'long' }}   ۱ مهر ۱۴۰۴
//
// WHY THE FORMAT IS EXPLICIT AND NOT `dateStyle: 'short'`
// -------------------------------------------------------
// `Intl.DateTimeFormat('fa-IR', { dateStyle: 'short' })` returns `۱۴۰۴/۷/۱` —
// month and day are NOT zero-padded, so a table column mixes `۱۴۰۴/۷/۱` with
// `۱۴۰۴/۱۱/۲۳` and the digits do not line up. Asking for `month: '2-digit'` and
// `day: '2-digit'` gives `۱۴۰۴/۰۷/۰۱` for every row, which is what a column of
// dates needs. Same locale, same calendar, one option different.
//
// THE TIMEZONE TRAP THIS PIPE EXISTS TO AVOID
// -------------------------------------------
// The API sends dates as `YYYY-MM-DD` (ARCHITECTURE.md §5: dates travel as UTC).
// `new Date('2025-09-23')` is parsed as UTC MIDNIGHT, so a viewer in a negative
// offset (the Americas) sees 2025-09-22 19:00 and the pipe would render the
// PREVIOUS day. A date-only string is a calendar date, not an instant, so it is
// parsed in LOCAL time here and the day never moves.
//
// A full timestamp (`...T10:30:00Z`) is a real instant, so it is parsed normally
// and shown in the viewer's own timezone — which is the correct reading of
// "when did this happen".
//
// INVALID INPUT NEVER THROWS
// --------------------------
// `Intl.format(new Date('nope'))` throws `RangeError: Invalid time value`. The
// pipe checks `getTime()` first and returns «—» (tc 7). It also rejects
// impossible dates: `new Date(2025, 1, 31)` silently rolls over to 3 March, so
// the parsed parts are compared back and a fake date is treated as invalid.
// ============================================================================

import { Pipe } from '@angular/core';
import type { PipeTransform } from '@angular/core';

/** The three shapes the panel actually needs. */
export type PersianDateStyle = 'short' | 'long' | 'monthYear';

/** A date-only value: `2025-09-23`. No time, so no timezone. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const FORMATS: Record<PersianDateStyle, Intl.DateTimeFormatOptions> = {
  /** `۱۴۰۴/۰۷/۰۱` — tables, lists, anything that lines up in a column. */
  short: { year: 'numeric', month: '2-digit', day: '2-digit' },
  /** `۱ مهر ۱۴۰۴` — a detail page, a receipt, a sentence. */
  long: { year: 'numeric', month: 'long', day: 'numeric' },
  /**
   * `۱۴۰۴ مهر` — a chart axis, where a day would be noise.
   *
   * Year first, which is CLDR's order for the year+month skeleton in `fa-IR`
   * (a full date puts the month before the year, as `long` does). Left alone
   * rather than reassembled: the pipe's job is to render the locale, not to
   * second-guess it.
   */
  monthYear: { year: 'numeric', month: 'long' },
};

/**
 * Formatters are cached per style: `Intl.DateTimeFormat` construction is the
 * expensive part, and a table calls this pipe once per row.
 */
const FORMATTERS = new Map<PersianDateStyle, Intl.DateTimeFormat>();

function formatterFor(style: PersianDateStyle): Intl.DateTimeFormat {
  let formatter = FORMATTERS.get(style);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('fa-IR', FORMATS[style]);
    FORMATTERS.set(style, formatter);
  }
  return formatter;
}

/** Normalises the accepted inputs to a valid `Date`, or `null` if unusable. */
function toDate(value: string | number | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const fromEpoch = new Date(value);
    return Number.isNaN(fromEpoch.getTime()) ? null : fromEpoch;
  }

  if (DATE_ONLY.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const local = new Date(year, month - 1, day);

    // `new Date(2025, 1, 31)` is 3 March, not an error. Compare the parts back
    // so 31 February is reported as invalid instead of silently becoming March.
    const isReal =
      local.getFullYear() === year && local.getMonth() === month - 1 && local.getDate() === day;
    return isReal ? local : null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formats a Gregorian date as Jalali (Persian calendar).
 *
 * @example
 * ```html
 * <td>{{ order.createdAt | persianDate }}</td>              <!-- ۱۴۰۴/۰۷/۰۱ -->
 * <td>{{ order.createdAt | persianDate: 'long' }}</td>      <!-- ۱ مهر ۱۴۰۴ -->
 * <td>{{ month | persianDate: 'monthYear' }}</td>           <!-- ۱۴۰۴ مهر -->
 * ```
 */
@Pipe({ name: 'persianDate' })
export class PersianDatePipe implements PipeTransform {
  /**
   * @param value A `YYYY-MM-DD` string, an ISO timestamp, a `Date`, or epoch ms.
   * `null` / `undefined` / `''` -> `''` (tc 6), so an absent date renders
   * nothing. An unparseable value -> `'—'` (tc 7), so a present-but-broken date
   * is visibly different from an absent one.
   * @param style `'short'` (default), `'long'` or `'monthYear'` (tc 2).
   */
  transform(
    value: string | number | Date | null | undefined,
    style: PersianDateStyle = 'short',
  ): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const date = toDate(value);
    if (!date) {
      return '—';
    }

    return formatterFor(style).format(date);
  }
}
