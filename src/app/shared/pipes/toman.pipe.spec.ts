// src/app/shared/pipes/toman.pipe.spec.ts
//
// The expected strings were produced by the same `Intl` runtime this app ships
// with, then written out literally so a future change to the pipe cannot quietly
// agree with itself.

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { formatToman, TomanPipe, TOMAN_UNIT } from './toman.pipe';

describe('TomanPipe', () => {
  const pipe = new TomanPipe();

  // tc 3 — grouping separator is U+066C (٬), not a Latin comma
  it('groups the amount and appends the unit', () => {
    expect(pipe.transform(1250000)).toBe('۱٬۲۵۰٬۰۰۰\u00A0تومان');
  });

  it('leaves an amount under one thousand ungrouped', () => {
    expect(pipe.transform(999)).toBe('۹۹۹\u00A0تومان');
  });

  // tc 4
  it('divides a Rial amount by ten when asked', () => {
    expect(pipe.transform(12500000, { rial: true })).toBe('۱٬۲۵۰٬۰۰۰\u00A0تومان');
  });

  it('rounds a Rial amount that is not a whole Toman', () => {
    expect(pipe.transform(12500005, { rial: true })).toBe('۱٬۲۵۰٬۰۰۱\u00A0تومان');
  });

  // tc 8
  it('renders zero with the unit', () => {
    expect(pipe.transform(0)).toBe('۰\u00A0تومان');
  });

  // tc 9 — substring, because the output starts with an invisible LRM (U+200E)
  // that CLDR adds to keep the minus on the left inside an RTL paragraph.
  it('keeps the minus sign and the grouping for a negative amount', () => {
    const out = pipe.transform(-45000);

    expect(out).toContain('−۴۵٬۰۰۰');
    expect(out.endsWith('تومان')).toBe(true);
  });

  // tc 6
  it('returns an empty string for null, undefined and the empty string', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });

  it('returns a dash for a value that is not a number', () => {
    expect(pipe.transform('abc')).toBe('—');
  });

  it('accepts the numeric string an API actually sends', () => {
    expect(pipe.transform('1250000')).toBe('۱٬۲۵۰٬۰۰۰\u00A0تومان');
  });

  it('omits the unit when the caller says so', () => {
    expect(pipe.transform(1250000, { unit: false })).toBe('۱٬۲۵۰٬۰۰۰');
  });

  // tc 12 — the number and the word cannot be split across lines
  it('joins the number and the unit with a no-break space', () => {
    const out = pipe.transform(1250000);

    expect(out).toContain('\u00A0');
    expect(out).not.toContain(' تومان');
  });

  // tc 11
  it('works through a template binding', () => {
    @Component({
      imports: [TomanPipe],
      template: `<span data-testid="out">{{ 2500000 | toman }}</span>`,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const out = fixture.nativeElement.querySelector('[data-testid="out"]') as HTMLElement;
    expect(out.textContent).toBe('۲٬۵۰۰٬۰۰۰\u00A0تومان');
  });

  // ── BO-E06: the pipe is a wrapper, and the constant is the only spelling ──

  it('exposes the one currency word every price reads (tc 4)', () => {
    expect(TOMAN_UNIT).toBe('تومان');
    expect(formatToman(1250000)).toContain(TOMAN_UNIT);
  });

  it('formatToman and the pipe return the same string for the same input', () => {
    // The chart formats from TypeScript and the templates format through the
    // pipe. Two implementations would let the same amount render two ways.
    for (const value of [0, 950, 1250000, 35_000_000, -45000]) {
      expect(new TomanPipe().transform(value)).toBe(formatToman(value));
      expect(new TomanPipe().transform(value, { unit: false })).toBe(
        formatToman(value, { unit: false }),
      );
    }
  });

  it('prints a fractional amount only when asked to', () => {
    expect(formatToman(12.6, { unit: false })).toBe('۱۳');
    expect(formatToman(12.6, { unit: false, fractionDigits: 1 })).toBe('۱۲٫۶');
  });
});
