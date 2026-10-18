// src/app/features/dashboard/dashboard.resolver.ts
//
// WHAT THIS IS
// ------------
// The route's data fetch, as a `ResolveFn` (the functional resolver API — no
// class, no constructor, `inject()` in the body). The route declares
// `resolve: { summary: summaryResolver }`, so by the time `Dashboard` is
// instantiated the summary is already in `ActivatedRoute.data`.
//
// WHY A RESOLVER AND NOT A COMPONENT FETCH
// ----------------------------------------
// BO-E01's «اجرای بهینه» asks for exactly this: the page renders with the data
// instead of rendering a spinner and then the data. The visible difference is
// the page the user sees on a slow connection — the previous page stays on
// screen until the new one is complete, so there is no flash of an empty
// dashboard, and no loading state the component has to own.
//
// The cost is honest and worth naming: resolvers BLOCK navigation, so a request
// that never completes traps the user on the old page. That is why the error
// path below is a `null` result rather than a rejection — a rejected resolver
// cancels the navigation entirely (`NavigationError`), which on a deep link
// means a blank screen.
//
// WHY `null` AND NOT A THROWN ERROR (tc 3)
// -----------------------------------------
// The resolver swallows the failure and returns `null`, so the component
// renders its own error state with a «تلاش دوباره» button. What the user sees
// is a page with a retry, not a spinner that stopped. The failure is NOT
// silenced along the way: `ErrorInterceptor` (BO-C04) has already toasted it,
// so the corner of the screen says what went wrong and the page says what to
// do about it.
//
// WHAT IS DELIBERATELY NOT HERE
// -----------------------------
// No `retry()`, no timeout, no `catchError` that returns a stub summary. A
// resolver that invents `{ totalSales: 0 }` on failure renders four confident
// zeroes, which is a lie the user then acts on. One request, one answer: either
// the real number or nothing.

import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import type { Data } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import type { Observable } from 'rxjs';

import type { DashboardSummary } from './models/dashboard.model';
import { DashboardService } from './services/dashboard';

/**
 * The key the resolved summary is stored under in `ActivatedRoute.data`.
 *
 * A constant because the string is written twice — once here and once by
 * `readSummary` — and a typo in either place would silently produce the error
 * state on every page load, which is the hardest kind of bug to notice.
 */
export const SUMMARY_DATA_KEY = 'summary';

/**
 * The one thing the resolver needs from a data source.
 *
 * An interface and not `DashboardService` on purpose. TypeScript counts a
 * `private` member in structural compatibility, so a test double that
 * implements `summary()` is still "not assignable" to the class — and the
 * alternative (casting every double to `as unknown as DashboardService`) is how
 * a typo in a stub stops being a compile error. Depending on the method keeps
 * the seam honest: `resolveSummary` works for the service today and for a
 * cached or aggregated source later.
 */
export interface SummarySource {
  summary(): Observable<DashboardSummary>;
}

/**
 * The fetcher, on its own so the spec can test it without an injection
 * context, a route snapshot, or a router.
 *
 * Split from `summaryResolver` because a `ResolveFn` takes `(route, state)`
 * arguments it never uses, and calling it directly in a test means
 * manufacturing two snapshots to satisfy the type. This function takes the one
 * thing it depends on, so the test hands it a recording source and asserts the
 * mapping — which is the part that can actually be wrong.
 *
 * @returns the summary, or `null` when the request failed (tc 3).
 */
export function resolveSummary(source: SummarySource): Observable<DashboardSummary | null> {
  return source.summary().pipe(
    // A `null` body is not an error worth an error page: an empty dashboard is
    // a legitimate answer from an API with no data yet, and it renders as «۰».
    map((summary) => summary ?? null),
    catchError(() => of(null)),
  );
}

/**
 * Pulls the summary back out of route data.
 *
 * Reads through `SUMMARY_DATA_KEY` rather than a property name, and treats
 * anything that is not a summary as absent. Route `data` is untyped by design
 * (`Data` is a string-keyed bag), so this is the one place where "the resolver
 * put nothing here" is decided — the component then only ever sees
 * `DashboardSummary | null` and has no `undefined` branch to forget.
 */
export function readSummary(data: Data): DashboardSummary | null {
  const value: unknown = data[SUMMARY_DATA_KEY];
  return value == null ? null : (value as DashboardSummary);
}

/**
 * Resolves the dashboard summary before `/dashboard` renders (tc 1).
 *
 * Runs once per navigation. `onSameUrlNavigation: 'reload'` (passed by the
 * page's retry) is what makes a repeat navigation reach it at all, and
 * `runGuardsAndResolvers: 'always'` is what makes the route actually re-run it.
 */
export const summaryResolver: ResolveFn<DashboardSummary | null> = () =>
  resolveSummary(inject(DashboardService));
