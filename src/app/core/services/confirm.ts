// src/app/core/services/confirm.ts
//
// WHAT THIS IS
// ------------
// The one way this app asks "are you sure?" — «آیا از حذف «کالای ۱۲۳» مطمئن
// هستید؟» — and gets the answer back as a `Promise<boolean>`:
//
// ```ts
// if (await this.confirm.confirm({ message: '…', danger: true })) {
//   this.products.remove(id);
// }
// ```
//
// The dialog itself is rendered once, by `<app-confirm-dialog>` in the root
// template; this service is the only part a feature ever touches.
//
// WHY A PROMISE INSTEAD OF PrimeNG's accept/reject CALLBACKS
// ----------------------------------------------------------
// PrimeNG's own API is callback shaped:
//
// ```ts
// this.confirmation.confirm({ message, accept: () => …, reject: () => … });
// ```
//
// That is fine for a one-liner and awkward for everything else: the decision is
// split across two closures, the code that acts on it sits far from the code
// that asked, and there is no way to `await` it inside a service or a guard. A
// Promise keeps the whole decision at the call site — the lines after the
// `await` run only if the user agreed — and it is trivially testable.
//
// WHY THE HOST RESOLVES THROUGH `settle()` AND NOT THE CALLBACKS
// --------------------------------------------------------------
// A confirmation can end four ways:
//
//   1. the accept button          -> ACCEPT
//   2. the reject button          -> REJECT
//   3. Escape, or the header's ✕  -> CANCEL
//   4. a programmatic close()     -> CANCEL
//
// Only the first two are `accept`/`reject`. Wiring just those two callbacks
// would leave the Promise of an Escape-dismissed dialog pending FOREVER: the
// caller would sit on an `await` for a dialog that is no longer on screen.
//
// So the host settles the request from the dialog's `onHide` event, which
// PrimeNG fires with ACCEPT, REJECT or CANCEL on all four paths. One code path,
// and no way to leak a pending Promise.
//
// `window.confirm` is never used (tc 10): it blocks the whole tab, cannot be
// themed, cannot be translated, and cannot be driven from a test.

import { Injectable, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import type { Confirmation } from 'primeng/api';

/**
 * Key of the second dialog instance — the one reserved for dangerous actions
 * (delete, cancel order, …).
 *
 * PrimeNG matches a request to a dialog by exact key equality, so this constant
 * is shared between the service (which stamps it on the request) and the host
 * (which stamps it on the `<p-confirmDialog>`). Two literals would be a silent
 * bug: the request would reach a dialog that does not exist and simply never
 * open.
 */
export const DANGER_KEY = 'danger';

/** What a caller can ask for. Only `message` is required. */
export interface ConfirmOptions {
  /**
   * The question itself, in Persian — ideally naming the thing being acted on,
   * because "are you sure?" with no subject is unanswerable:
   * «آیا از حذف محصول «کالای ۱۲۳» مطمئن هستید؟»
   */
  message: string;

  /** Dialog title. Defaults to «تأیید عملیات». */
  header?: string;

  /** Accept button label. Defaults to «تأیید». */
  acceptLabel?: string;

  /** Reject button label. Defaults to «لغو». */
  rejectLabel?: string;

  /** PrimeIcons class list for the dialog's glyph. */
  icon?: string;

  /**
   * Marks the action as destructive: a red accept button and a red warning
   * glyph, and the request is routed to the dialog reserved for danger.
   *
   * Use it for anything that loses data or cannot be undone — delete, cancel an
   * order, revoke a coupon. Leave it off for ordinary questions.
   */
  danger?: boolean;
}

/** Persian defaults, so a caller only has to write the question. */
const DEFAULT_HEADER = 'تأیید عملیات';
const DEFAULT_ACCEPT_LABEL = 'تأیید';
const DEFAULT_REJECT_LABEL = 'لغو';

/**
 * The two glyphs. Both are PrimeIcons class lists.
 *
 * The danger one is a warning triangle rather than a question mark: the SHAPE is
 * what this component controls, the COLOUR is not. The dialog's icon element is
 * painted by the theme (`--p-confirmdialog-icon-color`, which Aura maps onto the
 * overlay's text colour, so it follows the light/dark surface on its own), and a
 * Tailwind utility appended here loses to it for the same reason a class on the
 * mask does — the theme's stylesheet is injected after the app's.
 *
 * The red is not missed: a dangerous request gets a genuinely red accept button
 * (see `acceptButtonProps` below), which is the part a user actually reads.
 */
const INFO_ICON = 'pi pi-question-circle';
const DANGER_ICON = 'pi pi-exclamation-triangle';

/**
 * The cancel button's look, shared by every request.
 *
 * `secondary` + `outlined` is the closest thing the Aura preset has to the
 * reference's secondary button (bordered, grey text): a neutral outlined button
 * rather than a second filled one. Declared once so the two dialogs cannot drift
 * apart, and so the object identity is stable across change detection.
 */
const REJECT_BUTTON_PROPS = { severity: 'secondary', variant: 'outlined' } as const;

/**
 * Asks the user to confirm something and resolves with their answer.
 *
 * @example Deleting a product (the dangerous shape)
 * ```ts
 * async remove(product: Product): Promise<void> {
 *   const confirmed = await this.confirm.confirm({
 *     message: `آیا از حذف «${product.name}» مطمئن هستید؟`,
 *     header: 'حذف محصول',
 *     acceptLabel: 'حذف',
 *     danger: true,
 *   });
 *   if (!confirmed) return;
 *
 *   await this.products.remove(product.id);
 * }
 * ```
 *
 * @example An ordinary question, with only the message
 * ```ts
 * if (await this.confirm.confirm({ message: 'آیا از خروج از حساب مطمئن هستید؟' })) {
 *   this.auth.logout();
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly confirmation = inject(ConfirmationService);

  /**
   * The resolver of the request currently on screen, if any.
   *
   * One slot, not a queue: a confirmation is a modal question, so there is only
   * ever one of them in front of the user.
   */
  private pending: ((accepted: boolean) => void) | null = null;

  /**
   * Open the dialog and resolve `true` if the user accepted, `false` otherwise
   * — including when they dismissed it with Escape, the ✕, or a second
   * `confirm()` call that superseded this one.
   */
  confirm(options: ConfirmOptions): Promise<boolean> {
    // A second question supersedes the first, and the first is answered "no".
    //
    // Leaving it pending is the tempting bug: its `await` would never resume,
    // and the caller would wait forever on a dialog the user can no longer see.
    // "No" is the honest answer — the user never said yes to it.
    this.settle(false);

    const danger = options.danger === true;

    const request: Confirmation = {
      message: options.message,
      header: options.header ?? DEFAULT_HEADER,
      acceptLabel: options.acceptLabel ?? DEFAULT_ACCEPT_LABEL,
      rejectLabel: options.rejectLabel ?? DEFAULT_REJECT_LABEL,
      icon: options.icon ?? (danger ? DANGER_ICON : INFO_ICON),
      // «لغو» is always the quiet button.
      //
      // PrimeNG's confirm dialog gives BOTH buttons the default (primary) look,
      // so out of the box the accept and the reject button are the same orange
      // and the only difference is the label — which is a poor thing to make the
      // user read under pressure. This mirrors the reference's own pairing: a
      // filled `bg-primary-600` primary next to a bordered, grey-text secondary.
      //
      // It has to be set here rather than on the `<p-confirmDialog>` element:
      // `rejectButtonProps` is not a declared input of the component (only
      // `rejectButtonStyleClass` is), but PrimeNG copies every key of the request
      // onto the dialog instance, and `getRejectButtonProps()` reads it back.
      rejectButtonProps: REJECT_BUTTON_PROPS,
    };

    // Only a dangerous request names a key. An ordinary one leaves `key`
    // undefined on purpose, so it lands on the default dialog — and so does a
    // request from anything that talks to PrimeNG's ConfirmationService
    // directly, instead of silently reaching no dialog at all.
    if (danger) {
      request.key = DANGER_KEY;
      // `severity` is the v21 way to make the accept button red: the dialog
      // forwards these props to a real `p-button`, which maps the severity onto
      // the danger colour tokens. A Tailwind class could not do this — the
      // theme's own button rules are injected after the app's stylesheet and
      // would win.
      request.acceptButtonProps = { severity: 'danger' };
    }

    return new Promise<boolean>((resolve) => {
      this.pending = resolve;
      this.confirmation.confirm(request);
    });
  }

  /**
   * Resolve the request that is on screen. Called by the dialog host when the
   * dialog hides, and by `confirm()` when a new question replaces an old one.
   *
   * Safe to call when nothing is pending — it is a no-op — because the dialog
   * also hides on its own (Escape, ✕) without anybody having asked it to.
   *
   * The slot is cleared BEFORE resolving, so a re-entrant call (the caller
   * opening the next dialog from the `await` of this one) can never resolve the
   * same Promise twice.
   */
  settle(accepted: boolean): void {
    const resolve = this.pending;

    if (!resolve) {
      return;
    }

    this.pending = null;
    resolve(accepted);
  }
}
