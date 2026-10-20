// src/app/shared/components/error-state/error-state.ts
//
// WHAT THIS IS
// ------------
// The panel's inline «the request failed» block: a red alert with a triangle, a
// title, a sentence saying what went wrong, and a «تلاش دوباره» button. It is
// the SAME visual the dashboard's own error branch draws (dashboard.html), lifted
// out so every widget — and the page — renders one failure the same way
// (BO-E07 tc 8: one widget's error must not look different from another's).
//
//   <app-error-state message="خطا در دریافت سفارشات" (retry)="reload()" />
//
// WHY A SEPARATE COMPONENT FROM `empty-state`
// -------------------------------------------
// A failed fetch is NOT "no data". Reusing `app-empty-state` for it would tell
// the user «موردی برای نمایش وجود ندارد» when what actually happened is that the
// request failed — the user would think the shop is empty, not that the network
// is. The two states get different colours (red vs neutral), different icons
// (triangle vs inbox) and `role="alert"` vs `role="status")` for exactly that
// reason. See dashboard.html's own error branch, which this component replaces.
//
// WHY `role="alert"` AND NOT `role="status"`
// ------------------------------------------
// An error REPLACES content the user was waiting on. It is an interruption, not a
// quiet result, so it is announced the moment it appears rather than at the next
// screen-reader pause.
// ============================================================================

import { Component, input, output } from '@angular/core';

/**
 * PRACTICAL EXAMPLE (BO-E07)
 * --------------------------
 * A widget whose fetch rejected hands this block a message and listens for the
 * retry:
 *
 *   <app-error-state
 *     [title]="error()!"
 *     [description]="'لطفاً دوباره تلاش کنید.'"
 *     (retry)="retry.emit()"
 *   />
 *
 * Given `error() === 'دریافت سفارشات ناموفق بود'` and no overrides, the
 * template renders, in order:
 *   1. a red `#FEE2E2`-tinted bubble with the `pi-exclamation-triangle`
 *      glyph — wrapped in `role="alert"` because it replaced content the user
 *      was waiting on, so a screen reader announces it immediately, not at the
 *      next pause;
 *   2. the title «دریافت اطلاعات ناموفق بود» — the DEFAULT; a widget only
 *      overrides `title` when the failure has a specific owner (e.g. the sales
 *      chart passes «دریافت نمودار فروش ناموفق بود»);
 *   3. the description «لطفاً دوباره تلاش کنید.»;
 *   4. a «تلاش دوباره» button (`retryLabel()` default) whose only job, on
 *      click, is `retry.emit()` — the component's single output. The CALLER
 *      decides what "again" means: re-run this widget's request, or re-resolve
 *      the whole page. This block knows nothing about the router or which
 *      service to call.
 *
 * The same block is rendered by `dashboard.html`'s own failure branch, so a page
 * that breaks and a widget that breaks look identical (BO-E07 tc 8: one widget
 * failing must not look different from another, or from the page).
 */
/**
 * The inline failure block for a widget or page.
 *
 * @example A widget whose fetch rejected
 * ```html
 * <app-error-state
 *   [title]="'دریافت سفارشات ناموفق بود'"
 *   [description]="'لطفاً دوباره تلاش کنید.'"
 *   (retry)="reload()"
 * />
 * ```
 */
@Component({
  selector: 'app-error-state',
  templateUrl: './error-state.html',
})
export class ErrorState {
  /**
   * The headline sentence. Defaults to the panel's generic fetch failure, so a
   * widget that just wants to say "it broke" needs no configuration.
   */
  readonly title = input<string>('دریافت اطلاعات ناموفق بود');

  /**
   * One muted line under the title. Defaults to the panel's generic retry hint.
   */
  readonly description = input<string>('لطفاً دوباره تلاش کنید.');

  /**
   * Text of the retry button. Defaults to «تلاش دوباره» so the primary recovery
   * action is always present and spelled consistently across widgets.
   */
  readonly retryLabel = input<string>('تلاش دوباره');

  /**
   * Emitted when the retry button is clicked.
   *
   * Navigation / re-fetch stays the caller's business — a shared block has no
   * business knowing about the router or which service to call.
   */
  readonly retry = output<void>();
}
