// src/app/features/dashboard/dashboard.ts
//
// WHAT THIS IS
// ------------
// The panel's landing page, and the first FEATURE page in the app (BO-E01).
// It owns no fetching and no formatting of its own: the summary arrives through
// the route's resolver, and the tiles are the shared `StatCard` (BO-B10) with
// the shared pipes (BO-B16) doing the Persian digits and the Toman grouping.
//
// WHAT IT READS AND WHERE IT COMES FROM
// -------------------------------------
//   summary   ← `ActivatedRoute.data[SUMMARY_DATA_KEY]` (the resolver)
//   resolving ← Router events (a re-resolve in flight, e.g. a retry)
//
// There is no `@Input()` and no service call, which is the shape every feature
// page in this panel should have: the route fetches, the page renders.
//
// THE THREE STATES AND WHY THEY ARE THREE
// ---------------------------------------
//   1. data       → four KPI tiles
//   2. resolving  → a skeleton in the tiles' exact grid (tc 10)
//   3. no data    → an error block with a retry (tc 3)
//
// The loading state is NOT reachable on first paint, and that is deliberate:
// a resolver blocks navigation, so the component is only created once the data
// exists. The skeleton exists for the SECOND visit — a retry, a link back to
// «پیشخوان» — where the user is already looking at the page and a re-resolve is
// happening behind it. A first-paint progress bar belongs to the app shell
// (BO-C05's loading interceptor), not to this component.
//
// WHAT IS DELIBERATELY NOT HERE
// -----------------------------
// No trend arrows, no footer links, no click-through: BO-E02 owns the cards'
// presentation and E03–E05 own the chart, the recent-orders table and the
// low-stock list. This page renders what the resolver already returns, so the
// widget tasks add markup rather than plumbing.

import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import type { Data } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart } from '@angular/router';
import { LoadingBlock } from '@shared/components/loading-block/loading-block';
import { PageHeader } from '@shared/components/page-header/page-header';
import { StatCard } from '@shared/components/stat-card/stat-card';
import { PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { TomanPipe } from '@shared/pipes/toman.pipe';

import { readSummary } from './dashboard.resolver';
import type { DashboardSummary } from './models/dashboard.model';

@Component({
  selector: 'app-dashboard',
  imports: [PageHeader, StatCard, LoadingBlock, PersianDigitsPipe, TomanPipe],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  /**
   * Route data as a signal.
   *
   * `toSignal` rather than reading `route.snapshot.data`: a retry re-navigates
   * to the same route, and the snapshot is REPLACED rather than mutated — a
   * computed over the snapshot would keep the first visit's value forever.
   * `route.data` re-emits on every resolve, so this stays live across retries.
   */
  private readonly routeData = toSignal(this.route.data, { initialValue: {} as Data });

  /**
   * The resolved summary, or `null` when the resolve failed (tc 3).
   *
   * Reads through `readSummary` so the untyped route-data bag is narrowed in
   * exactly one place. `null` — never `undefined` — is the "no data" value, so
   * the template has one branch instead of two overlapping ones.
   */
  readonly summary = computed<DashboardSummary | null>(() => readSummary(this.routeData()));

  /**
   * True while a resolve is in flight for THIS page.
   *
   * `NavigationStart` covers more than this page — it fires for any navigation
   * — but the component is created by a navigation and destroyed by the next
   * one, so the only starts it can observe are navigations that either complete
   * here or leave. Both are cleared by the matching end/cancel/error event.
   */
  readonly resolving = signal(false);

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.resolving.set(true);
        return;
      }

      // Cancel and Error matter as much as End: a resolver that REJECTS (a
      // thrown error rather than the `null` this resolver returns) cancels the
      // navigation, and a skeleton that never clears is worse than the failure
      // it was hiding.
      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.resolving.set(false);
      }
    });
  }

  /**
   * Refetches by re-navigating to the page's own URL (tc 3's way out).
   *
   * `navigateByUrl(router.url)` and not `navigateByUrl('/dashboard')`: the
   * component should not know its own path any more than it should know the
   * API's.
   *
   * Two router settings have to cooperate for this to do anything, and missing
   * either one fails SILENTLY — the click does nothing and no error appears:
   *
   *   1. `onSameUrlNavigation: 'reload'` here. The router's default ('ignore')
   *      drops a navigation whose URL equals the current one before any guard
   *      or resolver is even considered (`NavigationSkipped`).
   *   2. `runGuardsAndResolvers: 'always'` on the route. Even after the
   *      navigation is accepted, a reused route is offered the previous
   *      route's already-resolved data unless the mode says otherwise
   *      (`getRouteGuards` copies `_resolvedData` forward).
   *
   * Both live one layer away from the component on purpose: the button says
   * "again", and the route decides what "again" costs.
   */
  retry(): void {
    void this.router.navigateByUrl(this.router.url, { onSameUrlNavigation: 'reload' });
  }
}
