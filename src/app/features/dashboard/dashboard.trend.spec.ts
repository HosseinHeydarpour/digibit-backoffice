// src/app/features/dashboard/dashboard.trend.spec.ts
//
// BO-E02 tc 4 (the arrow matches the direction) and tc 9 (a zero is data, not an
// error), tested on the pure function so the component spec can stay about the
// page. The two separators are written as escapes because U+066B (٫) and U+066A
// (٪) are invisible in a diff, and one wrong byte would silently pin the wrong
// character in the expectation.

import { toKpiTrend } from './dashboard.trend';

const DECIMAL = '\u066B';
const PERCENT = '\u066A';

describe('toKpiTrend (BO-E02)', () => {
  it('reads a positive change as an upward trend with a growth sentence (tc 4)', () => {
    expect(toKpiTrend(12.4)).toEqual({
      direction: 'up',
      percent: `۱۲${DECIMAL}۴${PERCENT}`,
      sentence: `افزایش ۱۲${DECIMAL}۴${PERCENT} نسبت به دیروز`,
    });
  });

  it('reads a negative change as a downward trend with a decline sentence (tc 4)', () => {
    expect(toKpiTrend(-3.5)).toEqual({
      direction: 'down',
      percent: `۳${DECIMAL}۵${PERCENT}`,
      sentence: `کاهش ۳${DECIMAL}۵${PERCENT} نسبت به دیروز`,
    });
  });

  it('prints the magnitude, never the sign, in the pill (tc 4)', () => {
    // The arrow carries the direction. «-۳٪» beside a down arrow says it twice
    // and reads as a double negative in RTL.
    expect(toKpiTrend(-3.5)?.percent.startsWith('-')).toBe(false);
  });

  it('treats an exact zero as no change at all (tc 9)', () => {
    expect(toKpiTrend(0)).toEqual({
      direction: 'neutral',
      percent: `۰${PERCENT}`,
      sentence: 'بدون تغییر نسبت به دیروز',
    });
  });

  it('treats a change too small to print as no change', () => {
    // 0.04 formats as «۰٪»; an arrow next to it would claim a direction the
    // user cannot see.
    expect(toKpiTrend(0.04)?.direction).toBe('neutral');
    expect(toKpiTrend(-0.04)?.direction).toBe('neutral');
  });

  it('returns null when the summary carries no change', () => {
    expect(toKpiTrend(null)).toBeNull();
    expect(toKpiTrend(undefined)).toBeNull();
    expect(toKpiTrend(Number.NaN)).toBeNull();
  });
});
