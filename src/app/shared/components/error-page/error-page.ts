// src/app/shared/components/error-page/error-page.ts
//
// WHAT THIS IS
// ------------
// The page a route lands on when there is nothing to show: «یافت نشد» (404) for
// an unknown URL, «دسترسی ندارید» (403) for a guard rejection.
//
//   { path: 'forbidden', component: ErrorPage, data: { code: 403 } }
//   { path: '**',        component: ErrorPage, data: { code: 404 } }
//
// ONE COMPONENT, NOT TWO PAGES
// ----------------------------
// The 404 and the 403 differ in exactly two strings and one number. Two templates
// would drift the moment somebody restyles the action row — the same argument
// EmptyState makes for owning its own layout. So the LAYOUT lives here and the
// COPY lives in `ERROR_COPY`, keyed by status code, which is the same shape as
// `ORDER_STATUS_META` and `FIELD_MESSAGES` elsewhere in this repo.
//
// The code arrives through `data`, because `app.config.ts` registers
// `withComponentInputBinding()` — route data binds straight to an input, so
// neither page needs a wrapper component just to hold two strings.
//
// WHY `code` IS `number` AND NOT A `403 | 404` UNION
// --------------------------------------------------
// Route `data` is untyped, so the value at runtime is whatever the routes file
// says. A closed union would look safe and then lie: `data: { code: 500 }` would
// compile and index a table that has no entry. The lookup therefore falls back to
// a generic pair, which is the honest handling of an open input.
//
// WHY THE DASHBOARD ACTION IS A BUTTON AND NOT `<a routerLink>`
// -------------------------------------------------------------
// An anchor would be the better default — middle-click, open in new tab. Two
// things pushed it the other way here: the repo forbids `vi.fn`/`vi.spyOn` in
// specs, so the component talks to `Router` and `Location` through one narrow
// method each that a recording class can stand in for (the same seam
// `ToastService` and the sidebar use); and `RouterLink` would drag a real router
// into every unit test of this page. If you prefer the anchor, swapping it in is
// one line — the test then needs `provideRouter([])`.
//
// WHY «بازگشت» IS CONDITIONAL
// ---------------------------
// tc 9 asks for a back link "if possible". A back button on a page the user
// deep-linked to is a trap: there is no previous page in the app, so it either
// does nothing or leaves the site. The router records `navigationId` in
// `history.state` (`_router-chunk.mjs`, `generateNgRouterState`), starting at 1
// for the first navigation in the session, so `> 1` means the user genuinely
// arrived from somewhere inside the panel.
// ============================================================================

import { Location } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';

/** The copy for one status code. */
interface ErrorCopy {
  heading: string;
  description: string;
}

/**
 * Status code -> the sentences shown for it.
 *
 * Only the two codes the app can actually produce are listed; anything else
 * falls through to `FALLBACK` rather than rendering an empty page.
 */
const ERROR_COPY: Readonly<Record<number, ErrorCopy>> = {
  403: {
    heading: 'به این صفحه دسترسی ندارید',
    description:
      'حساب کاربری شما مجوز دیدن این بخش را ندارد. اگر فکر می‌کنید اشتباهی رخ داده است، با مدیر سیستم تماس بگیرید.',
  },
  404: {
    heading: 'صفحه یافت نشد',
    description: 'نشانی‌ای که باز کرده‌اید وجود ندارد یا جابه‌جا شده است.',
  },
};

const FALLBACK: ErrorCopy = {
  heading: 'خطایی رخ داد',
  description: 'درخواست شما انجام نشد. لطفاً دوباره تلاش کنید.',
};

/**
 * Reads `navigationId` out of the history state the router wrote.
 *
 * A first navigation in the session is 1, so anything greater means there is a
 * real previous entry. `unknown` in, `boolean` out — `getState()` is typed
 * `unknown` and the shape is the router's business, not this component's.
 */
function hasPreviousPage(state: unknown): boolean {
  if (typeof state !== 'object' || state === null) {
    return false;
  }

  const id = (state as { navigationId?: unknown }).navigationId;
  return typeof id === 'number' && id > 1;
}

/**
 * The full-page «nothing here» state for an unmatched route or a refused
 * navigation.
 *
 * @example Wired from `app.routes.ts` — no template needed at the call site
 * ```ts
 * { path: 'forbidden', component: ErrorPage, data: { code: 403 }, title: 'دسترسی غیرمجاز' },
 * { path: '**', component: ErrorPage, data: { code: 404 }, title: 'صفحه یافت نشد' },
 * ```
 */
@Component({
  selector: 'app-error-page',
  imports: [PersianDigitsPipe],
  templateUrl: './error-page.html',
  styleUrl: './error-page.scss',
})
export class ErrorPage implements OnInit {
  /**
   * HTTP-style status code to show, e.g. `404`.
   *
   * Bound from route `data.code` by `withComponentInputBinding()`. A code with
   * no entry in `ERROR_COPY` renders the generic pair instead of breaking.
   */
  readonly code = input.required<number>();

  private readonly router = inject(Router);
  private readonly location = inject(Location);

  /** True when the user navigated here from inside the panel (tc 9). */
  private readonly canGoBack = signal(false);

  /** The sentences for this code. */
  protected readonly copy = computed<ErrorCopy>(() => ERROR_COPY[this.code()] ?? FALLBACK);

  /** Whether the secondary «بازگشت» action is rendered. */
  protected readonly showBack = this.canGoBack.asReadonly();

  ngOnInit(): void {
    // Read once, not in a computed: history state is not a signal, and the
    // answer cannot change while this page is on screen.
    this.canGoBack.set(hasPreviousPage(this.location.getState()));
  }

  /** tc 3 — the primary way out of an error page. */
  protected goToDashboard(): void {
    void this.router.navigateByUrl('/dashboard');
  }

  /** tc 9 — returns to wherever the user actually came from. */
  protected goBack(): void {
    this.location.back();
  }
}
