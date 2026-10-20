// src/app/features/dashboard/dashboard.ts
//
// WHAT THIS IS
// ------------
// The panel's landing page, and the first FEATURE page in the app (BO-E01).
// It owns no fetching: the summary arrives through the route's resolver. It
// owns no formatting either — the tiles are the shared `StatCard` (BO-B10), the
// numbers go through the shared pipes (BO-B16), and the one piece of arithmetic
// the page does add (a signed percentage -> arrow + colour + sentence) lives in
// `dashboard.trend.ts` so it is testable without a DOM.
//
// WHAT IT READS AND WHERE IT COMES FROM
// -------------------------------------
//   summary   ← `ActivatedRoute.data[SUMMARY_DATA_KEY]` (the resolver)
//   resolving ← Router events (a re-resolve in flight, e.g. a retry)
//
// THE FOUR KPI TILES (BO-E02)
// ---------------------------
//   1. فروش امروز       ← totalSales     + the trend pill (tc 4)
//   2. سفارش‌های جدید    ← pendingOrders  + «از ۳۴۲ سفارش ثبت‌شده»
//   3. کاربران          ← customerCount
//   4. کم‌موجودی         ← lowStockCount  + «از ۹۶ محصول», red while it is non-zero (tc 5)
//
// EVERY TILE IS THE LINK (tc 10)
// ------------------------------
// `actionable` + `(cardClick)` and NOT a nested `<a>`: a link inside a card that
// is itself a button puts an interactive element inside another one, which no
// screen reader and no keyboard user wants. The destination is a plain path
// string because the page already knows where its cards lead — a shared tile has
// no business importing the Router.
//
// THE THREE STATES AND WHY THEY ARE THREE
// ---------------------------------------
//   1. data       → four KPI tiles
//   2. resolving  → a skeleton in the tiles' exact grid (E01 tc 10)
//   3. no data    → an error block with a retry (E01 tc 3)
//
// The loading state is NOT reachable on first paint, and that is deliberate: a
// resolver blocks navigation, so the component is only created once the data
// exists. The skeleton exists for the SECOND visit — a retry, or a link back to
// «پیشخوان» — where the user is already looking at the page. A first-paint
// progress bar belongs to the app shell (BO-C05's loading interceptor).
//
// THE WIDGET ROW (BO-E03/E04/E05)
// -------------------------------
// Below the tiles: the recent-orders table, then a two-column row where the
// sales chart takes two thirds and the low-stock card one third. Each widget
// fetches its own data and owns its own three states, so one failing request
// cannot take the page down with it (BO-E07 tc 8). This file only wires them:
// chart range, order click, product edit click.
//
// WHAT IS DELIBERATELY NOT HERE
// -----------------------------
// No chart maths, no table markup, no threshold logic: BO-E03/E04/E05 own those
// inside their own components. This file stays the page — the four tiles, the
// layout, and the navigation each widget asks for.

import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import type { Data } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart } from '@angular/router';
import { ErrorState } from '@shared/components/error-state/error-state';
import { LoadingBlock } from '@shared/components/loading-block/loading-block';
import { PageHeader } from '@shared/components/page-header/page-header';
import { StatCard } from '@shared/components/stat-card/stat-card';
import type { Tone } from '@shared/components/stat-card/stat-card';
import { PersianDatePipe } from '@shared/pipes/persian-date.pipe';
import { PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { TOMAN_UNIT, TomanPipe } from '@shared/pipes/toman.pipe';
import { BehaviorSubject, catchError, of, switchMap, tap } from 'rxjs';

import { LOW_STOCK_THRESHOLD } from './dashboard.config';
import { readSummary } from './dashboard.resolver';
import { toKpiTrend } from './dashboard.trend';
import { LowStock } from './low-stock/low-stock';
import type {
  DashboardLowStockItem,
  DashboardRecentOrder,
  DashboardSummary,
  SalesChartPoint,
  SalesChartRange,
} from './models/dashboard.model';
import { RecentOrders } from './recent-orders/recent-orders';
import { SalesChart } from './sales-chart/sales-chart';
import { DashboardService } from './services/dashboard';

@Component({
  selector: 'app-dashboard',
  imports: [
    PageHeader,
    StatCard,
    LoadingBlock,
    SalesChart,
    RecentOrders,
    ErrorState,
    PersianDatePipe,
    PersianDigitsPipe,
    TomanPipe,
    LowStock,
  ],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly dashboardService = inject(DashboardService);

  /**
   * The page's own reload trigger for widgets that fetch for themselves.
   *
   * A `BehaviorSubject`, so it emits once at construction (the first visit) and
   * then only when the constructor's navigation watcher calls `next()` after a
   * navigation this page watched start and finish.
   */
  private readonly reload$ = new BehaviorSubject<void>(undefined);

  /**
   * Low-stock rows: one fetch on creation, one more after every re-resolve
   * (BO-E05), and a retry on failure (BO-E07).
   *
   * WHY NOT JUST `toSignal(service.lowStock())`
   * -------------------------------------------
   * Because the retry button would refresh the tiles and leave this card
   * showing the stock levels of five minutes ago. `runGuardsAndResolvers:
   * 'always'` re-runs the RESOLVER, but the component is REUSED, so a stream
   * created once in a field initialiser never runs again.
   *
   * WHY NOT `router.events.pipe(filter(NavigationEnd), switchMap(...))`
   * ------------------------------------------------------------------
   * Because the component is created DURING the navigation that resolves its
   * route — after `NavigationStart`, and in a test after `NavigationEnd` has
   * already been dispatched (the outlet only creates the page on the first
   * change detection). Depending on which of those two moments it lands in,
   * that stream either fetches twice on first paint or not at all. `reload$`
   * removes the race: it emits once immediately, and again only when this page
   * has actually SEEN a navigation start and end (see the constructor).
   *
   * THE ERROR PATH (BO-E07)
   * -----------------------
   * `catchError` keeps a rejected request from tearing down the component
   * (`toSignal` rethrows an uncaught error) and hands the widget an `error`
   * string via `lowStockError` — so the card shows the retry block instead of a
   * skeleton that spins forever. `tap` clears the error on the next success.
   *
   * TRACE: first visit → `reload$` emits → `lowStock(5)` → 300 ms of mock
   * delay → the card goes from skeleton (`items() === null`) to the list.
   * Retry → NavigationStart (resolving = true) → NavigationEnd → `reload$`
   * emits again → a second request → the card updates. A failed request →
   * `lowStockError` is set → the card shows «تلاش دوباره» → `retryLowStock()`
   * calls `reload$.next()` → the same re-fetch runs.
   */
  readonly lowStockError = signal<string | null>(null);

  readonly lowStockItems = toSignal<readonly DashboardLowStockItem[] | null>(
    this.reload$.pipe(
      switchMap(() =>
        this.dashboardService.lowStock(LOW_STOCK_THRESHOLD).pipe(
          tap({
            next: () => this.lowStockError.set(null),
            error: () => this.lowStockError.set('دریافت کالاهای کم‌موجودی ناموفق بود'),
          }),
          catchError(() => of(null)),
        ),
      ),
    ),
    { initialValue: null },
  );

  /**
   * Opens the product editor from the low-stock card.
   *
   * The widget emits and this page navigates — the widget deliberately carries
   * no `routerLink` on that button, so one click is one navigation.
   */
  onEditProduct(productId: string): void {
    void this.router.navigate(['/products', productId]);
  }

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
   * The resolved summary, or `null` when the resolve failed (E01 tc 3).
   *
   * Reads through `readSummary` so the untyped route-data bag is narrowed in
   * exactly one place. `null` — never `undefined` — is the "no data" value, so
   * the template has one branch instead of two overlapping ones.
   */
  readonly summary = computed<DashboardSummary | null>(() => readSummary(this.routeData()));

  /**
   * Today, frozen when the page is created.
   *
   * A plain field, not a signal or a ticking clock: «امروز» on a dashboard is
   * the day the page was opened, and a header that silently re-renders at
   * midnight would be a change nobody asked for. The pipe turns it Jalali (tc 3).
   */
  protected readonly today = new Date();

  /**
   * The currency word, handed to the sales tile's `unit` input (BO-E06 tc 4).
   *
   * A class member rather than the literal `unit="تومان"` in the template: the
   * unit is spelled once, in `TOMAN_UNIT`, and every place that prints a price
   * — this tile, the `toman` pipe, the chart's tooltip and its axis title —
   * reads that one constant. A second literal is how a panel ends up with
   * «تومان» on one card and «ریال» on the next.
   *
   * WHY A GETTER AND NOT `readonly tomanUnit = TOMAN_UNIT`
   * -----------------------------------------------------
   * A field initialiser runs when the COMPONENT is constructed, and in the test
   * bundle `toman.pipe.ts` is reachable from both the eager spec graph and the
   * lazy `dashboard-routes` chunk — so the bundler hoists it into a shared async
   * chunk and the binding can still be unset at construction. The tile then
   * rendered «۱٬۲۸۴٬۵۰۰٬۰۰۰» with no unit, and only when the whole suite ran.
   * A getter reads at change-detection time, by which point the module is
   * evaluated. (The same hazard is why a feature's `models/` folder holds no
   * runtime values — see AGENTS.md.)
   */
  protected get tomanUnit(): string {
    return TOMAN_UNIT;
  }

  /** The sales tile's arrow, colour and sentence, or `null` when there is no change. */
  protected readonly salesTrend = computed(() => toKpiTrend(this.summary()?.salesChangePercent));

  /**
   * Red only while something is actually running out (tc 5).
   *
   * A permanently red card is a red card nobody looks at. «کم‌موجودی: ۰» on a
   * healthy shop is good news, so it gets the neutral brand accent; the moment
   * the count is non-zero the bubble turns to the alert colour.
   */
  protected readonly lowStockTone = computed<Tone>(() =>
    (this.summary()?.lowStockCount ?? 0) > 0 ? 'negative' : 'neutral',
  );

  /**
   * True while a resolve is in flight for THIS page.
   *
   * `NavigationStart` covers more than this page — it fires for any navigation
   * — but the component is created by a navigation and destroyed by the next
   * one, so the only starts it can observe are navigations that either complete
   * here or leave. Both are cleared by the matching end/cancel/error event.
   */
  readonly resolving = signal(false);

  /** Active sales chart range (7 or 30 days). */
  readonly chartRange = signal<SalesChartRange>(7);

  /** True while the chart points are being fetched over HTTP. */
  readonly chartLoading = signal<boolean>(false);

  /**
   * Reactive stream driving chart data queries with auto-cancellation (tc 9).
   *
   * TRACE / PRACTICAL EXECUTION EXAMPLE:
   * ------------------------------------
   * 1. Initial State:
   *    - `chartRange` initialized to `7`.
   *    - `range$` initialized with `7`.
   *    - `salesChartData` starts evaluating: sets `chartLoading = true`, fires
   *      `dashboardService.salesChart(7)`.
   *    - HTTP response returns 7 data points -> `chartLoading = false`, `salesChartData()` holds 7 points.
   *
   * 2. User switches to 30 days:
   *    - User clicks "۳۰ روز اخیر" -> `onChartRangeChange(30)` is called.
   *    - `chartRange.set(30)` updates button active state immediately.
   *    - `range$.next(30)` triggers the pipeline:
   *      a. `tap`: `chartLoading.set(true)` activates the spinner.
   *      b. `switchMap`: initiates `dashboardService.salesChart(30)`.
   *
   * 3. Rapid click / Cancel in-flight (tc 9):
   *    - Before 30-day response arrives, user immediately clicks "۷ روز اخیر".
   *    - `onChartRangeChange(7)` calls `range$.next(7)`.
   *    - `switchMap` immediately unsubscribes/aborts the pending 30-day request (no redundant data or race conditions).
   *    - Only the new 7-day request is fetched and landed.
   */
  private readonly range$ = new BehaviorSubject<SalesChartRange>(7);

  readonly salesChartError = signal<string | null>(null);

  readonly salesChartData = toSignal<readonly SalesChartPoint[] | null>(
    this.range$.pipe(
      tap(() => this.chartLoading.set(true)),
      switchMap((range) =>
        this.dashboardService.salesChart(range).pipe(
          tap({
            next: () => {
              this.chartLoading.set(false);
              this.salesChartError.set(null);
            },
            error: () => {
              this.chartLoading.set(false);
              this.salesChartError.set('دریافت نمودار فروش ناموفق بود');
            },
          }),
          catchError(() => of(null)),
        ),
      ),
    ),
    { initialValue: null },
  );

  /** Handles range switches emitted by the sales chart widget. */
  onChartRangeChange(range: SalesChartRange): void {
    this.chartRange.set(range);
    this.range$.next(range);
  }

  /**
   * Re-runs the recent-orders fetch after it failed (BO-E07 tc 3).
   *
   * The widget's «تلاش دوباره» button emits `retry`, which lands here; this
   * re-triggers the SAME stream the first paint used, so a partial failure
   * recovers without disturbing the widgets that loaded fine.
   */
  retryRecentOrders(): void {
    this.recentReload$.next();
  }

  /**
   * Re-runs the sales-chart fetch for the currently selected range (BO-E07 tc 3).
   *
   * `range$.next(chartRange())` — not a hard-coded 7 or 30 — so a retry never
   * silently flips the chart between ranges.
   */
  retrySalesChart(): void {
    this.range$.next(this.chartRange());
  }

  /**
   * Re-runs the low-stock fetch after it failed (BO-E07 tc 3).
   *
   * `reload$.next()` is the same trigger a re-resolve uses, so the card behaves
   * identically whether the user retried the whole page or just this widget.
   */
  retryLowStock(): void {
    this.reload$.next();
  }

  /**
   * Recent orders: one fetch on creation, retry on failure (BO-E07).
   *
   * A `BehaviorSubject` drives it (like `reload$`): it emits once at
   * construction so the first paint starts a fetch immediately, and `next()` is
   * what a failed request's «تلاش دوباره» button calls. The catchError keeps a
   * rejection from crashing the page and records `recentOrdersError` so the
   * widget shows its retry block instead of a skeleton that never clears.
   */
  private readonly recentReload$ = new BehaviorSubject<void>(undefined);

  readonly recentOrdersError = signal<string | null>(null);

  readonly recentOrders = toSignal<readonly DashboardRecentOrder[] | null>(
    this.recentReload$.pipe(
      switchMap(() =>
        this.dashboardService.recentOrders().pipe(
          tap({
            next: () => this.recentOrdersError.set(null),
            error: () => this.recentOrdersError.set('دریافت سفارشات اخیر ناموفق بود'),
          }),
          catchError(() => of(null)),
        ),
      ),
    ),
    { initialValue: null },
  );

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
        // Read BEFORE clearing: only a navigation this page watched start and
        // finish re-ran the resolver, and only then is there anything new for
        // the self-fetching widgets to ask for. A Cancel or an Error has no
        // new data to show, so it just clears the skeleton.
        const refetch = this.resolving() && event instanceof NavigationEnd;
        this.resolving.set(false);

        if (refetch) {
          this.reload$.next();
        }
      }
    });
  }

  onOrderClick(orderId: string): void {
    void this.router.navigate(['/orders', orderId]);
  }

  /**
   * Refetches by re-navigating to the page's own URL (E01 tc 3's way out).
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

  /**
   * Opens a tile's destination (tc 10).
   *
   * A path, not a route name, and `void` on the promise: a navigation that is
   * refused resolves `false` and the router has already reported why, so there
   * is nothing here to catch.
   */
  open(path: string): void {
    void this.router.navigate([path]);
  }
}
