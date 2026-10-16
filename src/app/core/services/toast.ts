// src/app/core/services/toast.ts
//
// WHAT THIS IS
// ------------
// The one way this app says «ذخیره شد.» — a short message that appears in a
// corner of the screen, reports what just happened, and leaves on its own:
//
// ```ts
// this.toast.success('محصول با موفقیت ذخیره شد.');
// this.toast.error('ذخیره محصول انجام نشد.', { detail: 'ارتباط با سرور برقرار نشد.' });
// ```
//
// The toast itself is rendered once, by `<app-toast-host>` in the root template;
// this service is the only part a feature ever touches.
//
// WHY A WRAPPER AND NOT `MessageService` DIRECTLY
// ----------------------------------------------
// PrimeNG's `MessageService.add()` takes a `ToastMessageOptions` bag whose
// `severity` is a loose `string`, so without a wrapper every call site spells
// that bag out again:
//
// ```ts
// this.messages.add({ severity: 'warn', summary: '…', life: 3000 });   // don't
// this.toast.warning('…');                                            // do
// ```
//
// Three things are easy to get wrong that way, and each one is pinned by a test
// in toast.spec.ts:
//
//   1. PRIMENG CALLS WARNING «warn», NOT «warning». `'warning'` matches none of
//      the severity classes, so the message renders with no colour at all — a
//      typo that compiles, reads correctly in review, and only shows up on
//      screen. The mapping lives in SEVERITY, in one place.
//   2. Every message needs a `life`, or it inherits whatever the host was given.
//      The four levels do not deserve the same duration — see DEFAULT_LIFE.
//   3. `severity` is typed `string`, so any value compiles. Here the four levels
//      are four methods and there is no string to mistype.
//
// The wrapper is also the app's single place to change — a new level, a Persian
// wording rule, an analytics hook — without touching every feature.
//
// WHY `void` AND NOT A PROMISE OR A HANDLE
// ----------------------------------------
// A toast is fire-and-forget: nothing waits for the user to read it, and nothing
// acts on the answer, because there is no answer. The one thing a caller might
// want is to dismiss a message early, and that is `clear()` (all of them) or a
// short `life` (one of them). A returned handle would be an API nobody calls.
//
// WHY `sticky` AND `closable` ARE BOTH HERE
// -----------------------------------------
// They answer different questions and are easy to confuse:
//
//   sticky: true     never fades on its own; stays until dismissed (`life` is ignored)
//   closable: false  no ✕ button; cannot be dismissed by hand
//
// Set both and the message can never be removed — so `closable` defaults to ON
// and only an explicit `false` turns it off. A sticky message should stay
// closable.
//
// WHY THERE IS NO `icon`
// ----------------------
// PrimeNG 21 renders a per-severity inline SVG (a check, a circle-i, a circle-✕,
// a warning triangle) and only falls back to a `pi` font glyph when the message
// carries an explicit `icon`. Exposing `icon` here would invite call sites to
// replace a crisp, correctly-coloured SVG with a font icon for no reason (tc 7).

import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import type { ToastMessageOptions } from 'primeng/api';

/**
 * The four levels the app reports at.
 *
 * Named the way a call site reads — `toast.warning(…)` — which is deliberately
 * NOT the string PrimeNG wants on the message (it wants `'warn'`). See SEVERITY.
 */
export type ToastSeverity = 'success' | 'error' | 'warning' | 'info';

/** Everything a message can say beyond its summary. All optional. */
export interface ToastOptions {
  /**
   * Second line, in smaller type — the detail the summary had to leave out:
   * «کد رهگیری: ۴۵۸۷۱۲»، «ارتباط با سرور برقرار نشد.»
   */
  detail?: string;

  /**
   * How long the message stays on screen, in milliseconds. Defaults to
   * DEFAULT_LIFE for the level.
   *
   * `0` does NOT mean "forever": PrimeNG treats a falsy `life` as "not set" and
   * falls back to its own 3000ms. Use `sticky` for a message that must wait.
   */
  life?: number;

  /** Never fade on its own. Wins over `life`. */
  sticky?: boolean;

  /** Set false to remove the ✕ and make the message purely informational. */
  closable?: boolean;
}

/**
 * Level → the severity string PrimeNG actually styles.
 *
 * This table exists for one reason: the warning level is spelled `'warn'` in
 * PrimeNG, and `'warning'` — the obvious guess — matches no class at all. The
 * message then renders with no severity colour, which looks like a styling bug
 * rather than a typo.
 */
const SEVERITY: Record<ToastSeverity, string> = {
  success: 'success',
  error: 'error',
  warning: 'warn',
  info: 'info',
};

/**
 * How long each level stays, in milliseconds.
 *
 * Not one number for all four. Three seconds is enough to read «ذخیره شد.» and
 * not enough to read a server error, and a message that disappears before it has
 * been read is worse than no message: the user is left unsure whether the action
 * worked. PrimeNG's own default is 3000ms, so only the two that differ from it
 * are really a decision.
 *
 * The countdown pauses while the pointer rests on the toast, so a long message
 * can always be finished.
 */
const DEFAULT_LIFE: Record<ToastSeverity, number> = {
  success: 3000,
  info: 3000,
  warning: 5000,
  error: 5000,
};

/**
 * Shows short messages about what just happened.
 *
 * @example After a successful save
 * ```ts
 * this.toast.success('محصول با موفقیت ذخیره شد.');
 * ```
 *
 * @example A failure the user has to read, with the reason underneath
 * ```ts
 * this.toast.error('ذخیره محصول انجام نشد.', { detail: error.message });
 * ```
 *
 * @example A message that must not disappear before it is read
 * ```ts
 * this.toast.warning('موجودی این کالا رو به پایان است.', { sticky: true });
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly messages = inject(MessageService);

  /** «انجام شد.» */
  success(summary: string, options?: ToastOptions): void {
    this.show('success', summary, options);
  }

  /** «انجام نشد.» — the level the error interceptor reports through. */
  error(summary: string, options?: ToastOptions): void {
    this.show('error', summary, options);
  }

  /** «انجام شد، اما…» */
  warning(summary: string, options?: ToastOptions): void {
    this.show('warning', summary, options);
  }

  /** Neutral information — no failure, no success. */
  info(summary: string, options?: ToastOptions): void {
    this.show('info', summary, options);
  }

  /**
   * Dismiss every message on screen.
   *
   * Worth calling when the user navigates away or signs out: a message about the
   * page they just left is worse than no message.
   */
  clear(): void {
    this.messages.clear();
  }

  /** The one place a `ToastMessageOptions` is built. */
  private show(severity: ToastSeverity, summary: string, options: ToastOptions = {}): void {
    const message: ToastMessageOptions = {
      severity: SEVERITY[severity],
      summary,
      detail: options.detail,
      life: options.life ?? DEFAULT_LIFE[severity],
      sticky: options.sticky === true,
      // `!== false` rather than `=== true`: the ✕ is on by default, so only an
      // explicit `false` takes it away.
      closable: options.closable !== false,
    };

    this.messages.add(message);
  }
}
