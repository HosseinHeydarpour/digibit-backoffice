// src/app/features/dashboard/dashboard.trend.ts
//
// A signed percentage -> the three things a KPI tile needs to show it.
//
// WHY THIS IS ITS OWN FILE AND NOT A TEMPLATE EXPRESSION
// ------------------------------------------------------
// `StatCard` takes the direction, the printed percentage and the sentence as
// THREE separate inputs, so something has to decide that `12.4` means "up",
// «۱۲٫۴٪» and «افزایش ۱۲٫۴٪ نسبت به دیروز». Written inline, the sign is read
// three times in three expressions and one of them eventually disagrees with the
// other two — a green arrow beside the word «کاهش».
//
// A plain function, not a pipe, because it returns an OBJECT (three coordinated
// values); a pipe returning an object forces `?.[…]` access in every binding.
//
// WHY `Intl` AND NOT `persianDigits`
// ----------------------------------
// 12.4 has a fractional part, and `persianDigits` maps characters one for one —
// it would print «۱۲.۴» with a LATIN full stop. `Intl.NumberFormat('fa-IR')`
// emits the Persian decimal separator (U+066B, ٫) and the Persian digits
// together, which is the same argument `toman.pipe.ts` makes about grouping.
// The percent sign is U+066A (٪), not the Latin `%`.
//
// WHERE THIS GOES IF IT GROWS
// ---------------------------
// Into `shared/pipes` as a `percent` pipe the moment a second feature needs it.
// It is feature-local today because the sentence it returns («نسبت به دیروز»)
// is dashboard wording, which no other page wants.

import type { Trend } from '@shared/components/stat-card/stat-card';

/** `fa-IR`, one decimal at most: 12.4 -> «۱۲٫۴». Built once, like `toman`. */
const PERCENT = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 });

/**
 * Below this, the formatted value rounds to zero and a trend arrow would be
 * pointing at «۰٪» — a direction claim about something that did not visibly
 * move. Treated as "no change" instead.
 */
const VISIBLE_CHANGE = 0.05;

/** The trend pill's three inputs, decided together so they cannot disagree. */
export interface KpiTrend {
  /** Which way the number moved — picks the arrow and the pill's colour. */
  readonly direction: Trend;

  /** The pill's text, e.g. «۱۲٫۴٪». Always positive; the arrow carries the sign. */
  readonly percent: string;

  /** The muted sentence beside it, e.g. «افزایش ۱۲٫۴٪ نسبت به دیروز». */
  readonly sentence: string;
}

/**
 * Reads a signed percentage as a trend, or `null` when there is nothing to show.
 *
 * `null` — not a zeroed trend — for a missing or non-numeric value, so the tile
 * renders no footer row at all rather than a confident «۰٪».
 *
 * @param changePercent Signed change versus the previous period, e.g. `-3.2`.
 */
export function toKpiTrend(changePercent: number | null | undefined): KpiTrend | null {
  if (changePercent === null || changePercent === undefined || !Number.isFinite(changePercent)) {
    return null;
  }

  const magnitude = Math.abs(changePercent);
  const direction: Trend =
    magnitude < VISIBLE_CHANGE ? 'neutral' : changePercent > 0 ? 'up' : 'down';

  const percent = `${PERCENT.format(magnitude)}٪`;

  if (direction === 'neutral') {
    return { direction, percent, sentence: 'بدون تغییر نسبت به دیروز' };
  }

  const verb = direction === 'up' ? 'افزایش' : 'کاهش';
  return { direction, percent, sentence: `${verb} ${percent} نسبت به دیروز` };
}
