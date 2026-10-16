import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Jalali } from 'jalali-ts';

import { JalaliDatepicker } from './jalali-datepicker';

@Component({
  imports: [ReactiveFormsModule, JalaliDatepicker],
  template: `<app-jalali-datepicker [control]="control" />`,
})
class HostComponent {
  readonly control = new FormControl<string | null>(null);
}

function mount(initial: string | null = null) {
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.componentInstance.control.setValue(initial);
  fixture.detectChanges();
  return fixture;
}

function panel(host: HTMLElement): HTMLElement {
  return host.querySelector('.datepicker-outer-container') as HTMLElement;
}

function input(host: HTMLElement): HTMLInputElement {
  return host.querySelector('input') as HTMLInputElement;
}

/** Day buttons of the displayed month, excluding the neighbouring months' days. */
function currentMonthCells(host: HTMLElement): HTMLElement[] {
  return Array.from(host.querySelectorAll<HTMLElement>('.month-days .day-col .dp-btn')).filter(
    (cell) => !cell.className.includes('other'),
  );
}

function openCalendar(host: HTMLElement, fixture: { detectChanges: () => void }): void {
  input(host).dispatchEvent(new Event('focus'));
  fixture.detectChanges();
}

function pickDay(host: HTMLElement, day: string): void {
  const cell = currentMonthCells(host).find((candidate) => candidate.textContent?.trim() === day);
  expect(cell, `expected a "${day}" cell in the displayed month`).toBeTruthy();
  cell?.click();
}

describe('JalaliDatepicker', () => {
  it('converts between shamsi and gregorian (jalali-ts sanity)', () => {
    expect(Jalali.parse('1404/07/19').gregorian('YYYY-MM-DD')).toBe('2025-10-11');
    expect(Jalali.gregorian('2025-10-11').format('YYYY/MM/DD')).toBe('1404/07/19');
  });

  it('renders a text input', () => {
    const host = mount().nativeElement as HTMLElement;
    expect(input(host)).toBeTruthy();
    expect(input(host).type).toBe('text');
  });

  it('shows the jalali equivalent of the gregorian control value', () => {
    const host = mount('2025-10-11').nativeElement as HTMLElement;
    expect(input(host).value).toBe('1404/07/19');
  });

  it('renders a right-to-left calendar, in persian, for the control month', () => {
    const host = mount('2025-10-11').nativeElement as HTMLElement;
    const calendar = panel(host);

    expect(calendar).toBeTruthy();
    expect(calendar.getAttribute('dir')).toBe('rtl');
    expect(calendar.querySelector('.switch-view')?.textContent).toContain('1404');

    const weekDays = Array.from(calendar.querySelectorAll('.week-days .day-col')).map((day) =>
      day.textContent?.trim(),
    );
    expect(weekDays).toEqual(['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']);
  });

  it('hides the calendar until the input is focused', () => {
    const fixture = mount('2025-10-11');
    const host = fixture.nativeElement as HTMLElement;

    expect(panel(host).classList.contains('hide')).toBe(true);

    openCalendar(host, fixture);

    expect(panel(host).classList.contains('hide')).toBe(false);
  });

  it('writes a gregorian date to the control when a day is picked', () => {
    const fixture = mount('2025-10-11'); // 1404/07/19, so the calendar shows Mehr 1404
    const host = fixture.nativeElement as HTMLElement;
    openCalendar(host, fixture);

    pickDay(host, '1'); // 1404/07/01
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBe('2025-09-23');
  });

  it('never leaves a jalali string in the control', () => {
    const fixture = mount('2025-10-11');
    const host = fixture.nativeElement as HTMLElement;
    openCalendar(host, fixture);

    pickDay(host, '5'); // 1404/07/05
    fixture.detectChanges();

    const value = fixture.componentInstance.control.value;
    expect(value).toBe('2025-09-27');
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('does not convert in a loop (regression: jalali/gregorian ping-pong)', () => {
    const fixture = mount('2025-10-11');
    const host = fixture.nativeElement as HTMLElement;
    openCalendar(host, fixture);

    pickDay(host, '1');
    for (let i = 0; i < 5; i++) {
      fixture.detectChanges();
    }

    // Before the two-control split this drifted 1404 -> 2025 -> 2646 -> 3268.
    expect(fixture.componentInstance.control.value).toBe('2025-09-23');
  });

  it('follows the control when it is changed from outside', () => {
    const fixture = mount('2025-10-11');
    const host = fixture.nativeElement as HTMLElement;

    fixture.componentInstance.control.setValue('2026-01-01'); // 1404/10/11
    fixture.detectChanges();

    expect(input(host).value).toBe('1404/10/11');
  });

  it('clears the input when the control is cleared', () => {
    const fixture = mount('2025-10-11');
    const host = fixture.nativeElement as HTMLElement;

    fixture.componentInstance.control.setValue(null);
    fixture.detectChanges();

    expect(input(host).value).toBe('');
  });
});
