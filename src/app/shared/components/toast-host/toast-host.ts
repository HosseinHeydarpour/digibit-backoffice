// src/app/shared/components/toast-host/toast-host.ts
//
// WHAT THIS IS
// ------------
// The single place the app's toast messages are mounted. It renders one
// `<p-toast>` and decides how every message behaves as a container; nothing
// calls it — features inject `ToastService` and never see this file.
//
// WHY THE ROOT, AND NOT A PAGE OR THE LAYOUT
// ------------------------------------------
// A message about what just happened usually arrives AFTER a navigation (save,
// then leave the page), and a toast mounted inside a routed page would be
// destroyed by exactly that navigation — the message would be torn down before
// it was read. The root shell is never destroyed, so the toast cannot be either.
// (BO-B11's confirm dialog is mounted the same way, for the same reason.)
//
// WHERE IT APPEARS, AND WHY
// -------------------------
// Top-LEFT on desktop, which is the END side in this RTL app.
//
// PrimeNG's `position` is physical — `top-left` means the left edge whatever the
// document direction is — and the sidebar owns the start (right) edge: a 25rem
// toast at `top-right` would sit on top of the navigation. The end edge is free,
// and it is also where the design reference puts its own overlay: its
// notification drawer opens at `end-0` (admin-panel-index.html, line 1268).
//
// On a phone it moves to the BOTTOM and goes full width (tc 9). `breakpoints` is
// the lever for that: PrimeNG turns each entry into a real media query with
// `!important`, which is the only thing that can beat the inline `top`/`right`
// the component writes onto its root element. No matchMedia listener and no
// position signal are needed.
//
// WHY THE POSITION IS NOT AN INPUT
// --------------------------------
// A toast position is a house rule, not a per-page choice: two toasts in two
// corners would be a bug, not a feature. Fixing it here means no call site can
// disagree with any other.
//
// WHY THE SEVERITY ICONS ARE NOT SET BY ANYONE
// --------------------------------------------
// PrimeNG 21 renders an inline SVG per severity — a check, a circle-i, a
// circle-✕, a warning triangle — and only falls back to a `pi` font glyph when
// the message carries an explicit `icon`. So the right move is to set no icon at
// all: setting one would replace a crisp SVG with a font glyph and lose the
// automatic per-level mapping (tc 7) for nothing.
//
// THE REFERENCE HAS NO TOAST — WHAT PARITY MEANS HERE
// ---------------------------------------------------
// The design reference (`arino/page/fa/admin-panel-index.html`) contains no toast
// of any kind; its nearest relative is the notification drawer at line 1268, and
// that is a side panel, not an overlay message. What the drawer does define is
// the shape of a notification, and PrimeNG's toast already matches it: rounded
// corners, a 1px border, a soft shadow, a per-level glyph, a bold title above a
// muted detail line, and a round muted ✕ (lines 1292-1337).
//
// One difference is deliberate. The reference tints a small chip inside a
// NEUTRAL card; Aura tints the whole toast. Keeping Aura's is what tc 1 and tc 2
// ask for — a message that READS green or red at a glance, where a chip in a
// white card does not. The reference's chip is also not reachable as a theme
// token: the toast token set has `icon.size` and no `icon.background`, so
// reproducing it would mean `::ng-deep` CSS fighting the theme's own stylesheet
// — the trap BO-B11 documented for the dialog's backdrop.

import { Component } from '@angular/core';
import { Toast } from 'primeng/toast';

/**
 * Mounts the app's toast. Placed once, in `app.html`.
 *
 * @example It needs no inputs — the whole API is on `ToastService`
 * ```html
 * <router-outlet />
 * <app-confirm-dialog />
 * <app-toast-host />
 * ```
 */
@Component({
  selector: 'app-toast-host',
  imports: [Toast],
  templateUrl: './toast-host.html',
})
export class ToastHost {
  /**
   * The phone layout (tc 9): a full-width bar along the bottom of the screen.
   *
   * Each entry becomes
   * `@media screen and (max-width: 640px) { .p-toast[id] { … !important } }`,
   * so every property here has to reset or replace what the component already
   * wrote inline — hence `top: auto` next to `bottom`, and `width: auto` next to
   * `left`/`right` (the theme fixes the root at 25rem, which does not fit a
   * 360px phone).
   *
   * `left`/`right` rather than the logical `inset-inline-*`: the rule being
   * overridden is physical (`top-right` → `right: 20px`), and mixing the two
   * systems would leave one edge unset.
   *
   * The `env(safe-area-inset-bottom)` term keeps the bar clear of a phone's home
   * indicator; on a device without one the fallback of 0px applies.
   */
  protected readonly breakpoints = {
    '640px': {
      top: 'auto',
      bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
      left: '1rem',
      right: '1rem',
      width: 'auto',
    },
  };
}
