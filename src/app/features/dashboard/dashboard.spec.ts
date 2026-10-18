// src/app/features/dashboard/dashboard.spec.ts
//
// The route, the resolver and the page as one unit.
//
// This spec drives the REAL route definition (`DASHBOARD_ROUTES`, mounted the
// same way `app.routes.ts` mounts it) behind a host with a `<router-outlet>`,
// because the interesting behaviour is not on the component — it is in the
// wiring. A `TestBed.createComponent(Dashboard)` would see an empty
// `ActivatedRoute` and assert nothing about resolving at all.
//
// What it proves that the resolver's own spec cannot:
//   * the summary arrives through route data, not through the component
//   * a failed resolve lands in the page's error state (tc 3)
//   * the retry refetches, which only works because the route declares
//     `runGuardsAndResolvers: 'always'` (tc 8)
//   * the skeleton is visible while a re-resolve is in flight (tc 10)
//   * the lazy route's `data.title`/`data.breadcrumb` are still reachable by
//     the services that walk the route tree — the real risk of moving route
//     definitions out of `app.routes.ts`.

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { delay, of, throwError } from 'rxjs';
import type { Observable } from 'rxjs';

import { routes as APP_ROUTES } from '../../app.routes';

import { DASHBOARD_ROUTES } from './dashboard.routes';
import type { DashboardSummary } from './models/dashboard.model';
import { DashboardService } from './services/dashboard';

const SUMMARY: DashboardSummary = {
  totalSales: 1_284_500_000,
  pendingOrders: 23,
  customerCount: 187,
  productCount: 96,
  salesChangePercent: 12.4,
  lowStockCount: 7,
  newComments: 5,
};

/**
 * Serves the queued outcomes in order and repeats the last one.
 *
 * `delayMs` exists for one test only: the skeleton is only observable while a
 * resolve is still running, which needs a request that takes time. A plain
 * `of()` would complete before the assertion.
 */
class RecordingDashboardService {
  calls = 0;

  delayMs = 0;

  constructor(private readonly outcomes: (DashboardSummary | Error)[]) {}

  summary(): Observable<DashboardSummary> {
    const outcome = this.outcomes[Math.min(this.calls, this.outcomes.length - 1)];
    this.calls += 1;

    const source: Observable<DashboardSummary> =
      outcome instanceof Error ? throwError(() => outcome) : of(outcome);

    return this.delayMs > 0 ? source.pipe(delay(this.delayMs)) : source;
  }
}

/** A stand-in for the shell: the page is rendered by the router, as in the app. */
@Component({
  selector: 'app-dashboard-host',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
class Host {}

/**
 * The real feature routes, mounted the way `app.routes.ts` mounts them, plus
 * one dead-end route to navigate away to.
 */
const ROUTES = [{ path: '', children: [...DASHBOARD_ROUTES, { path: 'away', children: [] }] }];

function setup(outcomes: (DashboardSummary | Error)[]) {
  const service = new RecordingDashboardService(outcomes);

  TestBed.configureTestingModule({
    imports: [Host],
    providers: [provideRouter(ROUTES), { provide: DashboardService, useValue: service }],
  });

  const fixture = TestBed.createComponent(Host);
  const router = TestBed.inject(Router);

  return { fixture, router, service };
}

/** Navigate and let the navigation — including its resolve — settle. */
async function open(fixture: ComponentFixture<Host>, router: Router): Promise<void> {
  await router.navigateByUrl('/');
  await fixture.whenStable();
  fixture.detectChanges();
}

/** One macrotask: long enough for the router to emit NavigationStart. */
function tick(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/**
 * Waits for the router to reach a state, because a navigation's first events
 * are not observable in the same task as the click that started it.
 */
async function waitFor(
  fixture: ComponentFixture<Host>,
  predicate: () => boolean,
  what: string,
): Promise<void> {
  for (let attempt = 0; attempt < 50 && !predicate(); attempt += 1) {
    await tick();
    fixture.detectChanges();
  }

  expect(predicate(), `timed out waiting for: ${what}`).toBe(true);
}

const tiles = (fixture: ComponentFixture<Host>): NodeListOf<Element> =>
  fixture.nativeElement.querySelectorAll('app-stat-card');

describe('Dashboard (BO-E01)', () => {
  it('renders four KPI tiles from the resolved summary (tc 2)', async () => {
    const { fixture, router } = setup([SUMMARY]);
    await open(fixture, router);

    expect(tiles(fixture)).toHaveLength(4);

    const text: string = fixture.nativeElement.textContent;
    // Grouped Persian digits, unit suppressed on the input and printed by the
    // card itself — the reference's «42,850,000 تومان» layout.
    expect(text).toContain('۱٬۲۸۴٬۵۰۰٬۰۰۰');
    expect(text).toContain('۲۳');
    expect(text).toContain('۱۸۷');
    expect(text).toContain('سفارش‌های جدید');
    expect(text).toContain('کم‌موجودی');
  });

  it('shows the breadcrumb the lazy route declares', async () => {
    // The risk this pins: the route's `data` now lives inside a lazy chunk, so
    // if the walk in BreadcrumbService stopped one level early the trail would
    // silently lose its only chip.
    const { fixture, router } = setup([SUMMARY]);
    await open(fixture, router);

    const trail = fixture.nativeElement.querySelector('nav[aria-label="مسیر صفحه"]');
    expect(trail).toBeTruthy();
    expect(trail.textContent).toContain('پیشخوان');
  });

  it('resolves the summary exactly once per navigation (tc 6)', async () => {
    const { fixture, router, service } = setup([SUMMARY]);
    await open(fixture, router);

    expect(service.calls).toBe(1);
  });

  it('shows the error state when the resolve fails (tc 3)', async () => {
    const { fixture, router } = setup([new Error('boom')]);
    await open(fixture, router);

    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain('دریافت اطلاعات ناموفق بود');
    expect(tiles(fixture)).toHaveLength(0);
  });

  it('refetches from the retry button and then renders the data (tc 3, tc 8)', async () => {
    // The whole point of `onSameUrlNavigation: 'reload'` +
    // `runGuardsAndResolvers: 'always'`: the retry navigates to the URL the user
    // is already on, and the router still runs the resolver. Without either one
    // this click would be a silent no-op.
    const { fixture, router, service } = setup([new Error('boom'), SUMMARY]);
    await open(fixture, router);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();

    const retry = fixture.nativeElement.querySelector('[role="alert"] button') as HTMLButtonElement;
    retry.click();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.calls).toBe(2);
    expect(tiles(fixture)).toHaveLength(4);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows the skeleton while a retry is in flight (tc 10)', async () => {
    const { fixture, router, service } = setup([new Error('boom'), SUMMARY]);
    service.delayMs = 60;
    await open(fixture, router);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();

    const retry = fixture.nativeElement.querySelector('[role="alert"] button') as HTMLButtonElement;
    retry.click();

    // The navigation has started (NavigationStart fired) but the resolve has
    // not finished, which is exactly the window the skeleton exists for.
    await waitFor(
      fixture,
      () => fixture.nativeElement.querySelector('app-loading-block') !== null,
      'the loading skeleton',
    );
    expect(tiles(fixture)).toHaveLength(0);

    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-loading-block')).toBeNull();
    expect(tiles(fixture)).toHaveLength(4);
  });

  it('re-resolves when the user comes back to the page (tc 8)', async () => {
    const { fixture, router, service } = setup([SUMMARY, SUMMARY]);
    await open(fixture, router);
    expect(service.calls).toBe(1);

    await router.navigateByUrl('/away');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(tiles(fixture)).toHaveLength(0);

    await open(fixture, router);

    // Fresh numbers on every visit: no resolver-level cache is doing the work,
    // the router simply runs the resolve again.
    expect(service.calls).toBe(2);
    expect(tiles(fixture)).toHaveLength(4);
  });
});

describe('DASHBOARD_ROUTES', () => {
  const route = DASHBOARD_ROUTES[0];

  it('resolves the summary into route data (tc 1)', () => {
    expect(route.resolve).toBeTruthy();
    expect(route.resolve?.['summary']).toBeTypeOf('function');
  });

  it('re-runs the resolver on every navigation (tc 8)', () => {
    expect(route.runGuardsAndResolvers).toBe('always');
  });

  it('declares both title fields and the breadcrumb label', () => {
    // `breadcrumb.spec.ts` cannot see these any more — a lazy route's data is
    // inside the chunk — so this is the assertion that replaces it.
    expect(route.title).toBe('پیشخوان');
    expect(route.data?.['title']).toBe('پیشخوان');
    expect(route.data?.['breadcrumb']).toBe('پیشخوان');
  });

  it('is mounted lazily by app.routes (tc 4)', () => {
    const layout = APP_ROUTES[0];
    const mounted = (layout.children ?? []).find((child) => child.path === 'dashboard');

    expect(mounted?.loadChildren).toBeTypeOf('function');
  });
});
