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
// WHY A FUNCTION *AND* A PIPE
// ---------------------------
// The sales chart labels its x axis from TypeScript, and it used to build its
// own `Intl.DateTimeFormat` there — a second date formatter that could disagree
// with the pipe on the same value (BO-E06 tc 1, tc 2). `formatPersianDate` is
// the implementation; the pipe is a wrapper. The chart asks for the `'dayMonth'`
// style, which exists for exactly that axis.
//
// INVALID INPUT NEVER THROWS
// --------------------------
// `Intl.format(new Date('nope'))` throws `RangeError: Invalid time value`. The
// pipe checks `getTime()` first and returns «—» (tc 7). It also rejects
// impossible dates: `new Date(2025, 1, 31)` silently rolls over to 3 March, so
// the parsed parts are compared back and a fake date is treated as invalid.
//
// TRACE / PRACTICAL USAGE EXAMPLE
// -------------------------------
// The sales chart's x axis labels seven bars from the fixture series. Take the
// first point, `{ date: '2026-10-12', value: 29_600_000, orders: 16 }`:
//
// 1. CALLER — `sales-chart.ts` calls
//    `formatPersianDate('2026-10-12', 'dayMonth')`. It cannot use the pipe here:
//    the label is a property of a Chart.js options object, built in TypeScript,
//    not a value in a template.
//
// 2. NOT EMPTY — the value is a non-empty string, so the `''` branch is skipped.
//    (A `null` date would return `''` — an absent date renders nothing.)
//
// 3. `toDate('2026-10-12')` — the string matches `DATE_ONLY`, so it is split
//    into `[2026, 10, 12]` and rebuilt with `new Date(2026, 9, 12)` in LOCAL
//    time. Note the `9`: JS months are zero-based. This is the branch that
//    matters — `new Date('2026-10-12')` would be UTC midnight and a viewer in
//    UTC-5 would label the bar «۲۱ مهر» instead of «۲۰ مهر».
//
// 4. VALIDITY — `getTime()` is not `NaN`, and the parsed parts read back as
//    `2026 / 10 / 12`, so the date is accepted. `'2026-02-31'` would fail this
//    step (it rolls to 3 March) and render «—».
//
// 5. `formatterFor('dayMonth')` — looks up `FORMATS.dayMonth`, which is
//    `{ month: 'short', day: 'numeric' }`, and builds (then caches) one
//    `Intl.DateTimeFormat('fa-IR', …)` for that style.
//
// 6. `.format(...)` -> `'۲۰ مهر'`. The year is deliberately absent: every bar in
//    a 7-day or 30-day window is in the same year, so printing it seven times
//    would be seven pieces of noise. `'short'` is not a substitute here — it
//    renders `۱۴۰۵/۰۷/۲۰`, which reads as a date rather than a label.
// ============================================================================

import { Pipe } from '@angular/core';
import type { PipeTransform } from '@angular/core';

/** The four shapes the panel actually needs. */
export type PersianDateStyle = 'short' | 'long' | 'monthYear' | 'dayMonth';

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
  /**
   * `۲۶ مهر` — the sales chart's x axis, where the year is the same for every
   * bar and printing it seven times would be noise. `short` (numeric month and
   * day) reads as `۱۰/۲۶`, which is a date, not a label.
   */
  dayMonth: { month: 'short', day: 'numeric' },
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
 * The only date formatter in the app (BO-E06 tc 1, tc 2): the pipe delegates
 * here, and so does the sales chart's x axis.
 *
 * @example
 * ```ts
 * formatPersianDate('2026-10-18')                 // '۱۴۰۵/۰۷/۲۶'
 * formatPersianDate('2026-10-18', 'dayMonth')     // '۲۶ مهر'   ← chart axis
 * formatPersianDate('nope')                       // '—'
 * ```
 *
 * @param value A `YYYY-MM-DD` string, an ISO timestamp, a `Date`, or epoch ms.
 * @param style `'short'` (default), `'long'`, `'monthYear'` or `'dayMonth'`.
 */
export function formatPersianDate(
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
   * @param style `'short'` (default), `'long'`, `'monthYear'` or `'dayMonth'`.
   */
  transform(
    value: string | number | Date | null | undefined,
    style: PersianDateStyle = 'short',
  ): string {
    return formatPersianDate(value, style);
  }
}
