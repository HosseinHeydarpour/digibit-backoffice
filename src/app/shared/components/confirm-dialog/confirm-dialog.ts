// src/app/shared/components/confirm-dialog/confirm-dialog.ts
//
// WHAT THIS IS
// ------------
// The single place the app's confirmation dialogs are mounted. It renders the
// two PrimeNG dialog instances (ordinary + dangerous) and reports every way they
// can close back to `ConfirmService`, which is what turns a dialog into the
// `Promise<boolean>` that features actually use.
//
// Nothing calls this component: it is placed once in the root template and stays
// there for the life of the app. Features inject `ConfirmService` and never see
// this file.
//
// WHY THE ROOT, AND NOT A PAGE OR THE LAYOUT
// ------------------------------------------
// A confirmation can outlive a navigation. If the dialog were mounted inside
// `<app-main-layout>` or a routed page, navigating while it is open would destroy
// it mid-flight — the dialog would vanish and its Promise would hang. The root
// shell is never destroyed, so the dialog cannot be either.
//
// (The reference template puts its own overlays at the end of `<body>`, outside
// the app shell, for the same reason.)
//
// WHY THERE IS NO .scss
// ---------------------
// Every style here is either a PrimeNG theme token (the dialog surface, the
// buttons) or a Tailwind utility passed through `pt` (the scroll rule). A
// component stylesheet could not reach either: PrimeNG appends the dialog to
// `<body>`, so an emulated-encapsulation rule — even with `::ng-deep` — has no
// ancestor to hang from. Fighting the theme with a stylesheet would also lose:
// the theme's CSS is injected after the app's, so its rules win.
//
// WHY THE CLASS IS NOT CALLED `ConfirmDialog`
// -------------------------------------------
// `ConfirmDialog` is PrimeNG's own component class, and this file imports it.
// Naming ours the same would force an alias at the import site
// (`ConfirmDialog as PrimeConfirmDialog`), which is exactly the "same name, two
// meanings" trap the naming convention exists to avoid. `Host` says what this
// component is: the thing that hosts the dialogs.

import { Component, inject } from '@angular/core';
import { ConfirmService, DANGER_KEY } from '@core/services/confirm';
import { ConfirmEventType } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import type { ConfirmDialogPassThrough } from 'primeng/confirmdialog';

/** One mounted dialog instance. */
interface DialogInstance {
  /**
   * Stable identity, used only by the template's `@for` to know which instance
   * is which across change detection.
   */
  readonly id: 'default' | 'danger';

  /**
   * The PrimeNG key this instance answers to.
   *
   * `undefined` for the default instance — deliberately, not `'default'`. A
   * request that carries no key (PrimeNG's own `ConfirmationService.confirm()`,
   * called by code that has not been migrated) then still reaches a dialog
   * instead of silently reaching none.
   */
  readonly key: string | undefined;
}

/**
 * Mounts the app's confirmation dialogs. Placed once, in `app.html`.
 *
 * @example It needs no inputs — the whole API is on `ConfirmService`
 * ```html
 * <router-outlet />
 * <app-confirm-dialog />
 * ```
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [ConfirmDialog],
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialogHost {
  private readonly confirm = inject(ConfirmService);

  /** The two instances: ordinary questions, and destructive ones. */
  protected readonly dialogs: readonly DialogInstance[] = [
    { id: 'default', key: undefined },
    { id: 'danger', key: DANGER_KEY },
  ];

  /**
   * Width per screen size, handed to PrimeNG, which turns each entry into
   * `@media (max-width: <key>) { width: <value> !important }` (tc 11).
   *
   * 90vw on a phone leaves the dialog visibly a dialog — a full-bleed modal is
   * indistinguishable from a page and gives no cue that it must be answered.
   */
  protected readonly breakpoints = { '640px': '90vw' };

  /**
   * Pass-through styling for the dialog's internals.
   *
   * `content` is the only handle for the message area: the confirm dialog does
   * not forward the inner dialog's `contentStyle`/`contentStyleClass` inputs, so
   * without this a long message would run off the bottom of a phone screen with
   * no way to scroll to the buttons (tc 11).
   */
  protected readonly pt: ConfirmDialogPassThrough = {
    content: { class: 'max-h-[70vh] overflow-y-auto' },
  };

  /**
   * Every close of a confirm dialog arrives here, whatever caused it: the accept
   * button (ACCEPT), the reject button (REJECT), Escape or the header's ✕
   * (CANCEL), and a programmatic `ConfirmationService.close()` (which emits
   * `undefined` — not ACCEPT, so it counts as "لغو").
   *
   * This is why the service does not rely on PrimeNG's `accept`/`reject`
   * callbacks: those two never fire for Escape, so the Promise of a dismissed
   * dialog would never settle.
   */
  protected onHide(type: ConfirmEventType): void {
    this.confirm.settle(type === ConfirmEventType.ACCEPT);
  }
}
