// src/app/features/dashboard/dashboard.resolver.spec.ts
//
// The resolver on its own (BO-E01 tc 5: "unit test the resolver with a mocked
// service").
//
// The unit under test is `resolveSummary`, not the `ResolveFn` wrapper — the
// wrapper's only job is `inject(DashboardService)`, and testing that means
// manufacturing two router snapshots to satisfy a signature that ignores them.
// The integration that proves the wiring lives in `dashboard.spec.ts`, which
// drives the real route.

import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import type { Observable } from 'rxjs';

import {
  SUMMARY_DATA_KEY,
  readSummary,
  resolveSummary,
  summaryResolver,
} from './dashboard.resolver';
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
 * Records how many times the resolver actually called the service.
 *
 * A plain class, not `vi.fn()`: the repo's specs assert on recorded state, and
 * "called once" (tc 6) is a fact about the recorder, not about a mock.
 */
class RecordingDashboardService {
  calls = 0;

  constructor(private readonly outcome: DashboardSummary | Error) {}

  summary(): Observable<DashboardSummary> {
    this.calls += 1;
    return this.outcome instanceof Error ? throwError(() => this.outcome) : of(this.outcome);
  }
}

describe('resolveSummary', () => {
  it('passes the service result through (tc 1)', async () => {
    const service = new RecordingDashboardService(SUMMARY);

    await expect(firstValueFrom(resolveSummary(service))).resolves.toEqual(SUMMARY);
  });

  it('calls the service exactly once (tc 6)', async () => {
    const service = new RecordingDashboardService(SUMMARY);

    await firstValueFrom(resolveSummary(service));

    // One request per resolve. A second call would mean the resolver retries
    // internally, and two requests for one page load is what tc 6 forbids.
    expect(service.calls).toBe(1);
  });

  it('resolves to null when the request fails, and does not throw (tc 3)', async () => {
    const service = new RecordingDashboardService(new Error('boom'));

    // `resolves.toBeNull`, not `rejects`: a resolver that rejects cancels the
    // navigation, which on a deep link leaves the user on a blank screen. The
    // null is what lets the page render its own retry instead.
    await expect(firstValueFrom(resolveSummary(service))).resolves.toBeNull();
  });

  it('treats a null body as no data rather than an error', async () => {
    // An API with nothing to report yet is a legitimate answer, and it must not
    // end up in the error state — an empty dashboard renders as «۰».
    const service = new RecordingDashboardService(null as unknown as DashboardSummary);

    await expect(firstValueFrom(resolveSummary(service))).resolves.toBeNull();
  });
});

describe('readSummary', () => {
  it('reads the value stored under the shared key', () => {
    expect(readSummary({ [SUMMARY_DATA_KEY]: SUMMARY })).toEqual(SUMMARY);
  });

  it('returns null for absent or null route data', () => {
    // `null` and not `undefined`: the component branches on one value only, so
    // there is no second "maybe" state for a template to forget.
    expect(readSummary({})).toBeNull();
    expect(readSummary({ [SUMMARY_DATA_KEY]: null })).toBeNull();
  });
});

describe('summaryResolver', () => {
  /**
   * The snapshots are empty because this resolver reads neither — its inputs
   * are the injector's. They exist to satisfy `ResolveFn`'s signature.
   */
  const route = {} as unknown as ActivatedRouteSnapshot;
  const state = {} as unknown as RouterStateSnapshot;

  it('resolves DashboardService from the injector (the wiring test)', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: DashboardService, useValue: new RecordingDashboardService(SUMMARY) }],
    });

    // `ResolveFn` declares `MaybeAsync<...>`, so the union has to be narrowed
    // back to the observable this resolver actually returns before
    // `firstValueFrom` can take it.
    const resolved = TestBed.runInInjectionContext(() =>
      summaryResolver(route, state),
    ) as Observable<DashboardSummary | null>;

    // If `inject()` were called outside an injection context this would throw,
    // and if the token were misspelled the injector would fail first. Either
    // way the route would render the error state forever.
    expect(await firstValueFrom(resolved)).toEqual(SUMMARY);
  });

  it('returns null when the injected service fails', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: DashboardService, useValue: new RecordingDashboardService(new Error('x')) },
      ],
    });

    const resolved = TestBed.runInInjectionContext(() =>
      summaryResolver(route, state),
    ) as Observable<DashboardSummary | null>;

    expect(await firstValueFrom(resolved)).toBeNull();
  });
});
