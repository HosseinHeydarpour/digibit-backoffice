// src/app/shared/components/toast-host/toast-host.spec.ts
//
// The host is tested with the REAL `<p-toast>` and the REAL MessageService, for
// the same reason the confirm dialog is (BO-B11): the half that only exists in
// the template — which corner it lands in, that the ✕ removes the message, that
// the phone rule is generated at all — cannot be observed through a fake. A fake
// MessageService would prove nothing about what a user sees.
//
// The severity glyphs are asserted on the rendered SVG (`data-p-icon`), because
// that is the markup PrimeNG 21 emits per level — and the reason no call site
// sets `icon` (see the component's header).

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ToastService } from '@core/services/toast';
import { MessageService } from 'primeng/api';
import { Toast, ToastItem } from 'primeng/toast';

import { ToastHost } from './toast-host';

/** Minimal host: the toast component is placed once, exactly as in app.html. */
@Component({
  imports: [ToastHost],
  template: `<app-toast-host />`,
})
class Host {}

describe('ToastHost', () => {
  let fixture: ComponentFixture<Host>;
  let service: ToastService;

  /** The mounted toast component — one per app. */
  function toast(): Toast {
    return fixture.debugElement.query(By.directive(Toast)).componentInstance as Toast;
  }

  /** One entry per message PrimeNG is currently showing. */
  function items(): ToastItem[] {
    return fixture.debugElement
      .queryAll(By.directive(ToastItem))
      .map((debug) => debug.componentInstance as ToastItem);
  }

  /** The rendered message elements. */
  function messages(): NodeListOf<Element> {
    return document.querySelectorAll('.p-toast-message');
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      // MessageService is not `providedIn: 'root'` (see app.config.ts), so the
      // real app registers it and this test has to as well — with the real one,
      // because the toast subscribes to it in its constructor.
      providers: [MessageService],
    }).compileComponents();

    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    // The toast is appended to <body>, outside the fixture, so it has to be
    // torn down by hand or the next spec's `document.querySelector` would find
    // the previous run's messages.
    fixture.destroy();
    document.querySelectorAll('.p-toast').forEach((node) => node.remove());
  });

  it('mounts exactly one toast for the whole app', () => {
    expect(fixture.debugElement.queryAll(By.directive(Toast)).length).toBe(1);
  });

  it('renders a success message with the success class and its check glyph (tc 1, tc 7)', () => {
    service.success('محصول ذخیره شد.');
    fixture.detectChanges();

    expect(document.querySelector('.p-toast-message-success')).toBeTruthy();
    expect(document.querySelector('.p-toast-message svg[data-p-icon="check"]')).toBeTruthy();
  });

  it('renders an error message with the error class and its circle-✕ glyph (tc 2, tc 7)', () => {
    service.error('ذخیره نشد.');
    fixture.detectChanges();

    expect(document.querySelector('.p-toast-message-error')).toBeTruthy();
    expect(document.querySelector('.p-toast-message svg[data-p-icon="times-circle"]')).toBeTruthy();
  });

  it('renders the warning triangle and the info circle for those two levels (tc 7)', () => {
    service.warning('موجودی کم است.');
    service.info('در حال پردازش…');
    fixture.detectChanges();

    expect(document.querySelector('.p-toast-message-warn')).toBeTruthy();
    expect(document.querySelector('svg[data-p-icon="exclamation-triangle"]')).toBeTruthy();
    expect(document.querySelector('svg[data-p-icon="info-circle"]')).toBeTruthy();
  });

  it('renders the Persian summary as written and forces no direction of its own (tc 6)', () => {
    service.success('محصول «کیف چرم» ذخیره شد.');
    fixture.detectChanges();

    const root = document.querySelector('.p-toast') as HTMLElement;

    expect(root.textContent).toContain('محصول «کیف چرم» ذخیره شد.');

    // The app is RTL at the document level (`<html dir="rtl">`) and the toast
    // inherits it, because nothing here sets `dir` or a direction. Pinned so a
    // future `dir="ltr"` cannot slip in and silently left-align every message.
    expect(root.getAttribute('dir')).toBeNull();
    expect(root.style.direction).toBe('');
  });

  it('keeps several different messages in one column instead of stacking overlays (tc 5)', () => {
    service.success('اول');
    service.error('دوم');
    fixture.detectChanges();

    // One root, two children: PrimeNG lays the messages out in a column inside a
    // single fixed container, so they queue and cannot overlap the way two
    // separate overlays would.
    expect(document.querySelectorAll('.p-toast').length).toBe(1);
    expect(messages().length).toBe(2);
  });

  it('drops a duplicate while the first copy is still on screen (tc 5)', () => {
    expect(toast().preventOpenDuplicates).toBe(true);

    service.success('ذخیره شد.');
    service.success('ذخیره شد.');
    fixture.detectChanges();

    expect(messages().length).toBe(1);
  });

  it('starts closing the message when its ✕ is clicked (tc 4)', () => {
    service.success('ذخیره شد.');
    fixture.detectChanges();

    const item = items()[0];
    expect(item.visible()).toBe(true);

    const close = document.querySelector('.p-toast-close-button') as HTMLButtonElement;
    expect(close).toBeTruthy();
    close.click();
    fixture.detectChanges();

    // The item's own signal rather than the DOM: removing the element waits for
    // a CSS leave animation, and jsdom never runs animations. `visible() ===
    // false` is the point where a browser starts fading the message out.
    expect(item.visible()).toBe(false);
  });

  it('hides a message once its duration is up (tc 3)', async () => {
    service.success('ذخیره شد.', { life: 300 });
    fixture.detectChanges();

    const item = items()[0];
    expect(item.visible()).toBe(true);

    // Real timers, deliberately: PrimeNG starts this countdown inside
    // `zone.runOutsideAngular`, and faking timers around a zone-patched
    // setTimeout is a reliable source of flakes.
    await new Promise((resolve) => setTimeout(resolve, 450));

    expect(item.visible()).toBe(false);
  });

  it('moves to the bottom of a phone screen and goes full width (tc 9)', () => {
    // PrimeNG turns `breakpoints` into a generated @media rule in <head>, so the
    // phone layout can be asserted as it is actually applied rather than as a
    // property on the instance.
    const generated = Array.from(document.head.querySelectorAll('style'))
      .map((style) => style.innerHTML)
      .join('\n');

    expect(generated).toContain('max-width: 640px');
    expect(generated).toContain('bottom:');
    expect(generated).toContain('width:auto');
  });
});
