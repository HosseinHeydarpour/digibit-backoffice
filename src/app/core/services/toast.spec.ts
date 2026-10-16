// src/app/core/services/toast.spec.ts
//
// The service is tested against a FAKE MessageService, not the real one. What
// this file is about is the `ToastMessageOptions` bag the service builds — the
// severity string, the duration, the close button — and a fake captures that bag
// exactly as PrimeNG would receive it: no overlay, no timers, no DOM.
//
// That the bag actually renders a green or a red message is the host's half of
// the job and is tested there, against the real component (toast-host.spec.ts).
//
// No `vi.spyOn` anywhere: this setup wires only `vitest/globals` types, and no
// spec in the repo uses `vi` (see theme.spec.ts, confirm.spec.ts). A plain
// object that records what it was handed is enough, and it reads better.

import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import type { ToastMessageOptions } from 'primeng/api';

import { ToastService } from './toast';

/** Records every message PrimeNG was asked to show, in order. */
class FakeMessageService {
  readonly added: ToastMessageOptions[] = [];
  cleared = 0;

  add(message: ToastMessageOptions): void {
    this.added.push(message);
  }

  clear(): void {
    this.cleared += 1;
  }
}

describe('ToastService', () => {
  let fake: FakeMessageService;
  let service: ToastService;

  beforeEach(() => {
    fake = new FakeMessageService();

    TestBed.configureTestingModule({
      providers: [{ provide: MessageService, useValue: fake }],
    });

    service = TestBed.inject(ToastService);
  });

  it('sends a success message with the severity PrimeNG paints green (tc 1, tc 10)', () => {
    service.success('محصول با موفقیت ذخیره شد.');

    expect(fake.added.length).toBe(1);
    expect(fake.added[0].severity).toBe('success');
    expect(fake.added[0].summary).toBe('محصول با موفقیت ذخیره شد.');
  });

  it('sends an error message with the severity PrimeNG paints red (tc 2, tc 10)', () => {
    service.error('ذخیره محصول انجام نشد.');
    expect(fake.added[0].severity).toBe('error');
  });

  it('maps warning onto «warn», the only spelling PrimeNG styles', () => {
    service.warning('موجودی این کالا رو به پایان است.');

    // `'warning'` — the obvious guess — matches none of PrimeNG's severity
    // classes, so the message renders with no colour at all: a typo that
    // compiles, looks right in review, and only shows up on screen. This is the
    // single most valuable assertion in this file.
    expect(fake.added[0].severity).toBe('warn');
  });

  it('sends an info message', () => {
    service.info('گزارش در حال آماده‌سازی است.');
    expect(fake.added[0].severity).toBe('info');
  });

  it('gives every level a duration, and an error longer than a success (tc 3)', () => {
    service.success('ذخیره شد.');
    service.error('ذخیره نشد.');

    const successLife = fake.added[0].life ?? 0;
    const errorLife = fake.added[1].life ?? 0;

    expect(successLife).toBeGreaterThan(0);
    expect(errorLife).toBeGreaterThan(successLife);
  });

  it('lets the caller override the duration (tc 3)', () => {
    service.success('ذخیره شد.', { life: 1200 });
    expect(fake.added[0].life).toBe(1200);
  });

  it('keeps a sticky message on screen until it is dismissed', () => {
    service.warning('اتصال به سرور قطع شد.', { sticky: true });
    expect(fake.added[0].sticky).toBe(true);
  });

  it('shows the ✕ by default and lets the caller take it away (tc 4)', () => {
    service.success('ذخیره شد.');
    service.info('در حال پردازش…', { closable: false });

    expect(fake.added[0].closable).toBe(true);
    expect(fake.added[1].closable).toBe(false);
  });

  it('carries the optional detail line', () => {
    service.error('ذخیره نشد.', { detail: 'ارتباط با سرور برقرار نشد.' });
    expect(fake.added[0].detail).toBe('ارتباط با سرور برقرار نشد.');
  });

  it('dismisses everything on clear()', () => {
    service.success('ذخیره شد.');
    service.clear();

    expect(fake.cleared).toBe(1);
  });
});
