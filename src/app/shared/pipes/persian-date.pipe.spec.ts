// src/app/shared/pipes/persian-date.pipe.spec.ts
//
// These assertions are timezone-independent ON PURPOSE. A date-only string is
// parsed as a local calendar date, so the same expectations hold on a CI runner
// in UTC and on a machine in Tehran — which is exactly the property the pipe is
// built for.

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PersianDatePipe } from './persian-date.pipe';

describe('PersianDatePipe', () => {
  const pipe = new PersianDatePipe();

  // tc 1 — the API's own format
  it('converts a Gregorian date-only string to Jalali', () => {
    expect(pipe.transform('2025-09-23')).toBe('۱۴۰۴/۰۷/۰۱');
  });

  it('converts Nowruz correctly', () => {
    expect(pipe.transform('2026-03-21')).toBe('۱۴۰۵/۰۱/۰۱');
  });

  it('converts the last day of a Jalali year correctly', () => {
    expect(pipe.transform('2025-03-20')).toBe('۱۴۰۳/۱۲/۳۰');
  });

  // tc 1 — a real instant, not a date-only value
  it('accepts an ISO timestamp', () => {
    expect(pipe.transform('2025-09-23T12:00:00Z')).toBe('۱۴۰۴/۰۷/۰۱');
  });

  it('accepts a Date object', () => {
    expect(pipe.transform(new Date(2025, 8, 23))).toBe('۱۴۰۴/۰۷/۰۱');
  });

  // tc 2
  it('formats the long style with the month name', () => {
    expect(pipe.transform('2025-09-23', 'long')).toBe('۱ مهر ۱۴۰۴');
  });

  // CLDR orders the year+month skeleton YEAR FIRST for `fa-IR` — `۱۴۰۴ مهر`,
  // not the `مهر ۱۴۰۴` a Persian reader would write by hand. Pinned as-is on
  // purpose: the pipe's contract is "the locale's own rendering", and
  // reassembling the parts to get the other order would make this one style the
  // only hand-built string in the file. `long` above keeps the natural
  // day-month-year order, because a full date uses a different skeleton.
  it('formats the monthYear style for a chart axis', () => {
    expect(pipe.transform('2025-09-23', 'monthYear')).toBe('۱۴۰۴ مهر');
  });

  it('zero-pads month and day in the short style', () => {
    expect(pipe.transform('2024-12-31')).toBe('۱۴۰۳/۱۰/۱۱');
  });

  // tc 6
  it('returns an empty string for null, undefined and the empty string', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });

  // tc 7
  it('returns a dash for an unparseable string instead of throwing', () => {
    expect(pipe.transform('not-a-date')).toBe('—');
  });

  it('returns a dash for an invalid Date object', () => {
    expect(pipe.transform(new Date('nope'))).toBe('—');
  });

  it('rejects a calendar date that does not exist', () => {
    // `new Date(2025, 1, 31)` silently becomes 3 March; the pipe must not accept
    // it and print a date the user never entered.
    expect(pipe.transform('2025-02-31')).toBe('—');
  });

  // tc 11
  it('works through a template binding', () => {
    @Component({
      imports: [PersianDatePipe],
      template: `<span data-testid="out">{{ '2025-09-23' | persianDate }}</span>`,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const out = fixture.nativeElement.querySelector('[data-testid="out"]') as HTMLElement;
    expect(out.textContent).toBe('۱۴۰۴/۰۷/۰۱');
  });
});
