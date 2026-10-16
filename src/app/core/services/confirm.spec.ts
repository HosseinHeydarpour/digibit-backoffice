// src/app/core/services/confirm.spec.ts
//
// One `describe` per task is the house pattern. Each test names the test case it
// proves, so `npm test` output maps 1:1 onto TASKS-PHASE-1.md.
//
// The service is tested against a FAKE ConfirmationService rather than the real
// one, because the real one only publishes a Subject: nothing would happen until
// a real `<p-confirmDialog>` were mounted, and the service's own contract —
// "what did you ask PrimeNG to show?" and "what happens to the Promise?" — would
// be buried under a second component's lifecycle. The dialog itself is covered
// in confirm-dialog.spec.ts, which is where the ACCEPT/REJECT/CANCEL mapping
// lives.
//
// No `vi.spyOn` anywhere: this setup wires only `vitest/globals` types, and no
// spec in the repo uses `vi` (see theme.spec.ts). A plain object with the two
// methods the service calls is enough, and it reads better.

import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from 'primeng/api';
import type { Confirmation } from 'primeng/api';

import { ConfirmService, DANGER_KEY } from './confirm';

/** Records what the service asked PrimeNG to open, in order. */
class FakeConfirmationService {
  readonly requests: Confirmation[] = [];

  confirm(confirmation: Confirmation): void {
    this.requests.push(confirmation);
  }

  /** The request PrimeNG was asked to show most recently. */
  get last(): Confirmation {
    return this.requests[this.requests.length - 1];
  }
}

describe('ConfirmService', () => {
  let fake: FakeConfirmationService;
  let service: ConfirmService;

  beforeEach(() => {
    fake = new FakeConfirmationService();

    TestBed.configureTestingModule({
      providers: [{ provide: ConfirmationService, useValue: fake }],
    });

    service = TestBed.inject(ConfirmService);
  });

  it('asks PrimeNG to open a dialog carrying the message (tc 1)', () => {
    void service.confirm({ message: 'آیا از حذف این محصول مطمئن هستید؟' });

    expect(fake.requests.length).toBe(1);
    expect(fake.last.message).toBe('آیا از حذف این محصول مطمئن هستید؟');
  });

  it('resolves true when the dialog is accepted (tc 2)', async () => {
    const answer = service.confirm({ message: 'حذف شود؟' });

    // What the host does when the dialog hides with ACCEPT.
    service.settle(true);

    await expect(answer).resolves.toBe(true);
  });

  it('resolves false when the dialog is rejected (tc 3)', async () => {
    const answer = service.confirm({ message: 'حذف شود؟' });

    service.settle(false);

    await expect(answer).resolves.toBe(false);
  });

  it('falls back to Persian labels and a Persian title (tc 4)', () => {
    void service.confirm({ message: 'حذف شود؟' });

    // The dialog is unusable with PrimeNG's English defaults — «Yes»/«No» in a
    // Persian panel — so the caller should never have to think about them.
    expect(fake.last.header).toBe('تأیید عملیات');
    expect(fake.last.acceptLabel).toBe('تأیید');
    expect(fake.last.rejectLabel).toBe('لغو');
  });

  it('lets the caller override every label (tc 4)', () => {
    void service.confirm({
      message: 'سفارش لغو شود؟',
      header: 'لغو سفارش',
      acceptLabel: 'لغو سفارش',
      rejectLabel: 'بازگشت',
    });

    expect(fake.last.header).toBe('لغو سفارش');
    expect(fake.last.acceptLabel).toBe('لغو سفارش');
    expect(fake.last.rejectLabel).toBe('بازگشت');
  });

  it('routes a dangerous request to the danger dialog, in red (tc 5)', () => {
    void service.confirm({ message: 'حذف شود؟', danger: true });

    // The key is what puts the request on the second dialog instance; without it
    // the danger styling below would never be shown.
    expect(fake.last.key).toBe(DANGER_KEY);
    // `severity` reaches a real `p-button`, which maps it onto the danger tokens.
    expect(fake.last.acceptButtonProps).toEqual({ severity: 'danger' });
    // The glyph's shape is what this layer controls; its colour comes from the
    // theme, which follows the light/dark surface.
    expect(fake.last.icon).toBe('pi pi-exclamation-triangle');
  });

  it('leaves an ordinary request on the default dialog, uncoloured (tc 5)', () => {
    void service.confirm({ message: 'خروج از حساب؟' });

    // No key at all — not an empty string — so the request lands on the instance
    // whose key is also undefined.
    expect(fake.last.key).toBeUndefined();
    expect(fake.last.acceptButtonProps).toBeUndefined();
    expect(fake.last.icon).toBe('pi pi-question-circle');
  });

  it('keeps «لغو» visually neutral next to the accept button (tc 5)', () => {
    void service.confirm({ message: 'حذف شود؟', danger: true });

    // PrimeNG gives both buttons the same primary look by default, which leaves
    // two identical orange buttons distinguished only by their labels. The reject
    // button is sent as an outlined secondary instead, mirroring the reference's
    // filled-primary / bordered-secondary pairing.
    expect(fake.last.rejectButtonProps).toEqual({ severity: 'secondary', variant: 'outlined' });
  });

  it('answers a superseded request with false (tc 9)', async () => {
    const first = service.confirm({ message: 'اول' });
    const second = service.confirm({ message: 'دوم' });

    // The first dialog is replaced before the user answered it, so "no" is the
    // only honest answer — and, crucially, an answer: without this the caller
    // would await a dialog that is no longer on screen, forever.
    await expect(first).resolves.toBe(false);

    service.settle(true);
    await expect(second).resolves.toBe(true);
  });

  it('sends a repeat call to the same dialog instance (tc 9)', () => {
    void service.confirm({ message: 'اول' });
    void service.confirm({ message: 'دوم' });

    // Two requests, one instance: the host renders exactly one dialog per key, so
    // a rapid second call can only replace the first, never stack a second modal
    // on top of it.
    expect(fake.requests.length).toBe(2);
    expect(fake.requests[0].key).toBe(fake.requests[1].key);
  });

  it('ignores a settle when nothing is pending (tc 9)', async () => {
    // The dialog also hides on its own — Escape, the ✕ — so a stray settle must
    // be harmless rather than throwing or resolving somebody else's request.
    service.settle(true);

    const answer = service.confirm({ message: 'حذف شود؟' });
    service.settle(false);

    await expect(answer).resolves.toBe(false);
  });

  it('is not confused by a duplicate hide event (tc 9)', async () => {
    const first = service.confirm({ message: 'اول' });
    service.settle(true);
    // A second hide event for the same close, arriving after the first.
    service.settle(false);

    await expect(first).resolves.toBe(true);
  });

  it('never falls back to window.confirm (tc 10)', () => {
    // Shadowing the global and restoring it by hand: no `vi.spyOn` in this setup.
    // `window.confirm` blocks the whole tab, cannot be themed or translated, and
    // is invisible to every test in this file — so the one thing worth asserting
    // is that it is never reached.
    const original = window.confirm;
    let calls = 0;
    window.confirm = (() => {
      calls += 1;
      return false;
    }) as typeof window.confirm;

    try {
      void service.confirm({ message: 'حذف شود؟', danger: true });
      expect(calls).toBe(0);
    } finally {
      window.confirm = original;
    }
  });
});
