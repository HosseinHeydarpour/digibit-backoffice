// src/app/shared/pipes/persian-digits.pipe.spec.ts
//
// No TestBed for the logic cases: a pipe is a plain class with one method, so
// `new PersianDigitsPipe()` is the honest test. One host component at the bottom
// proves it also works the way a template uses it (tc 11).

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { formatDigits, PersianDigitsPipe } from './persian-digits.pipe';

describe('PersianDigitsPipe', () => {
  const pipe = new PersianDigitsPipe();

  // tc 5
  it('converts every Latin digit to its Persian counterpart', () => {
    expect(pipe.transform('1234567890')).toBe('۱۲۳۴۵۶۷۸۹۰');
  });

  // tc 5 — a number, not just a string
  it('accepts a number', () => {
    expect(pipe.transform(1404)).toBe('۱۴۰۴');
  });

  // tc 8
  it('renders zero as ۰ and not as an empty string', () => {
    expect(pipe.transform(0)).toBe('۰');
  });

  // tc 6
  it('returns an empty string for null and undefined instead of throwing', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  it('leaves non-digit characters alone', () => {
    expect(pipe.transform('سفارش 42 از 100')).toBe('سفارش ۴۲ از ۱۰۰');
  });

  it('does not touch text that is already Persian', () => {
    expect(pipe.transform('۱۴۰۴')).toBe('۱۴۰۴');
  });

  // tc 11
  it('works through a template binding', () => {
    @Component({
      imports: [PersianDigitsPipe],
      template: `<span data-testid="out">{{ 'کد 1042' | persianDigits }}</span>`,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const out = fixture.nativeElement.querySelector('[data-testid="out"]') as HTMLElement;
    expect(out.textContent).toBe('کد ۱۰۴۲');
  });

  // ── BO-E06: the chart's count axis uses the same digit formatter ──────────

  it('exposes the same mapping as a function, for TypeScript callers (tc 7)', () => {
    expect(formatDigits('کد 1042')).toBe('کد ۱۰۴۲');
    expect(formatDigits(19)).toBe('۱۹');
    expect(formatDigits(null)).toBe('');
    expect(new PersianDigitsPipe().transform(19)).toBe(formatDigits(19));
  });
});
