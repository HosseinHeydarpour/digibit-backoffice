// src/app/shared/components/confirm-dialog/confirm-dialog.spec.ts
//
// The host is tested with the REAL PrimeNG dialog and the REAL
// ConfirmationService mounted. That split matters: the service spec
// (confirm.spec.ts) covers what the caller gets back, against a fake, and this
// file covers the half that only exists in the template — which dialog a request
// lands on, and how each of the four ways a dialog can close maps onto that
// answer.
//
// A fake ConfirmationService cannot stand in here: `<p-confirmDialog>` subscribes
// to `requireConfirmation$` in its constructor, and it is that subscription which
// makes a dialog visible at all. Using the real one means the assertions below
// observe what a user would: real dialogs, in the real document.
//
// The events are emitted from the real `<p-confirmDialog>` instance rather than
// by poking a method on the host, because the wiring under test IS the template
// binding: `(onHide)="onHide($event)"`. Calling the handler directly would pass
// even if the binding were misspelled or missing.

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ConfirmService, DANGER_KEY } from '@core/services/confirm';
import { ConfirmEventType, ConfirmationService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Dialog } from 'primeng/dialog';

import { ConfirmDialogHost } from './confirm-dialog';

/** Minimal host: the dialog component is placed once, exactly as in app.html. */
@Component({
  imports: [ConfirmDialogHost],
  template: `<app-confirm-dialog />`,
})
class Host {}

describe('ConfirmDialogHost', () => {
  let fixture: ComponentFixture<Host>;
  let service: ConfirmService;

  /** The two mounted confirm dialogs, in template order: default, then danger. */
  function confirmDialogs(): ConfirmDialog[] {
    return fixture.debugElement
      .queryAll(By.directive(ConfirmDialog))
      .map((debug) => debug.componentInstance as ConfirmDialog);
  }

  /** The inner p-dialog of each instance — what actually governs the overlay. */
  function innerDialogs(): Dialog[] {
    return fixture.debugElement
      .queryAll(By.directive(Dialog))
      .map((debug) => debug.componentInstance as Dialog);
  }

  /** Replay what PrimeNG emits when a dialog hides for a given reason. */
  function hide(index: number, type: ConfirmEventType): void {
    confirmDialogs()[index].onHide.emit(type);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [ConfirmationService],
    }).compileComponents();

    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    service = TestBed.inject(ConfirmService);
  });

  afterEach(() => {
    // The dialogs append themselves to <body>, outside the fixture, so the
    // fixture's own teardown does not always take them with it. Left behind,
    // they would leak into the next test's document-wide queries.
    document.querySelectorAll('.p-dialog, .p-dialog-mask').forEach((element) => element.remove());
  });

  it('mounts exactly one dialog per key — ordinary and dangerous (tc 1)', () => {
    const dialogs = confirmDialogs();

    // Two instances, two keys, and the default one's key is `undefined` on
    // purpose: PrimeNG matches a request to a dialog by exact key equality, so a
    // request that carries no key still has somewhere to land.
    expect(dialogs.length).toBe(2);
    expect(dialogs.map((dialog) => dialog.key)).toEqual([undefined, DANGER_KEY]);
  });

  it('resolves true when the dialog reports ACCEPT (tc 2)', async () => {
    const answer = service.confirm({ message: 'حذف شود؟' });
    fixture.detectChanges();

    hide(0, ConfirmEventType.ACCEPT);

    await expect(answer).resolves.toBe(true);
  });

  it('resolves false when the dialog reports REJECT (tc 3)', async () => {
    const answer = service.confirm({ message: 'حذف شود؟' });
    fixture.detectChanges();

    hide(0, ConfirmEventType.REJECT);

    await expect(answer).resolves.toBe(false);
  });

  it('counts CANCEL as «لغو» — the Escape path (tc 6)', async () => {
    const answer = service.confirm({ message: 'حذف شود؟' });
    fixture.detectChanges();

    // Escape, the header's ✕ and a programmatic close all arrive as CANCEL (a
    // programmatic one as `undefined`). This is the case the service's Promise
    // would hang on if only accept/reject were wired.
    hide(0, ConfirmEventType.CANCEL);

    await expect(answer).resolves.toBe(false);
  });

  it('counts an undefined hide — a programmatic close — as «لغو» (tc 6)', async () => {
    const answer = service.confirm({ message: 'حذف شود؟' });
    fixture.detectChanges();

    hide(0, undefined as unknown as ConfirmEventType);

    await expect(answer).resolves.toBe(false);
  });

  it('never dismisses on a backdrop click (tc 7)', () => {
    const inner = innerDialogs();

    // Pinned rather than left to PrimeNG's default: for a delete confirmation a
    // stray click outside the dialog is the cheapest way to lose data, so this
    // must stay false even if a future version changes what "default" means.
    expect(inner.length).toBe(2);
    expect(inner.map((dialog) => dialog.dismissableMask)).toEqual([false, false]);
  });

  it('starts focus on «لغو», not on «تأیید» (tc 8)', () => {
    // PrimeNG defaults `defaultFocus` to 'accept', which puts the destructive
    // button under a reflexive Enter. Both instances override it.
    expect(confirmDialogs().map((dialog) => dialog.defaultFocus)).toEqual(['reject', 'reject']);
  });

  it('does not stack a second dialog when confirm() is called twice (tc 9)', () => {
    void service.confirm({ message: 'اول' });
    fixture.detectChanges();
    const afterFirst = document.querySelectorAll('.p-dialog').length;

    void service.confirm({ message: 'دوم' });
    fixture.detectChanges();

    // One instance per key is what makes this true: the second request replaces
    // the first on the same dialog instead of opening another modal on top of it.
    expect(afterFirst).toBe(1);
    expect(document.querySelectorAll('.p-dialog').length).toBe(afterFirst);

    // And it really is the same instance: only the ordinary dialog is open, the
    // danger one was never touched.
    expect(confirmDialogs().filter((dialog) => dialog.visible === true).length).toBe(1);
  });

  it('is 90vw on a phone (tc 11)', () => {
    // PrimeNG turns `breakpoints` into a generated @media rule in <head>, so the
    // width can be asserted as it is actually applied rather than as a property
    // on the instance.
    const generated = Array.from(document.head.querySelectorAll('style'))
      .map((style) => style.innerHTML)
      .join('\n');

    expect(generated).toContain('max-width: 640px');
    expect(generated).toContain('90vw');
  });

  it('scrolls a long message inside the dialog instead of off-screen (tc 11)', () => {
    void service.confirm({ message: 'یک پیام بسیار طولانی که در موبایل جا نمی‌شود.' });
    fixture.detectChanges();

    // The scroll rule reaches the dialog's inner content through `pt`, because
    // the confirm dialog does not forward the inner dialog's contentStyleClass.
    expect(document.body.innerHTML).toContain('max-h-[70vh]');
    expect(document.body.innerHTML).toContain('overflow-y-auto');
  });
});
