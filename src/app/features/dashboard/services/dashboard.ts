// src/app/features/dashboard/services/dashboard.ts
//
// The dashboard's API surface — one method today, one route.
//
// WHY A SERVICE AND NOT A COMPONENT FETCH
// ---------------------------------------
// The route file owns the *when* (the resolver) and the component owns the
// *what it looks like*; this class owns the *where it comes from*. A component
// that fetches in `ngOnInit` cannot be re-resolved by the router, shows a
// loading state it has to invent itself, and drags HTTP into every test of the
// page. BO-E01's whole point is that the data arrives before the page renders.
//
// WHAT IS DELIBERATELY NOT HERE
// -----------------------------
// No caching, no `shareReplay`, no local state. The resolver runs once per
// navigation, so the retry button is a re-navigation (which re-runs the
// resolver) rather than a cache bypass — and a second caller of `summary()`
// getting a fresh request is the correct behaviour for a dashboard.
//
// SWAPPING MOCK FOR REAL CHANGES NOTHING HERE
// --------------------------------------------
// `ApiService` is the single seam (BO-C01): the mock interceptor sits behind it
// and answers `/dashboard/summary` from fixtures while `environment.useMockApi`
// is true. When the backend exists, the method body is byte-for-byte identical.

import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/services/api';
import { Observable } from 'rxjs';

import type { DashboardRecentOrder } from '../models/dashboard.model';
import type { DashboardSummary, SalesChartPoint, SalesChartRange } from '../models/dashboard.model';

/**
 * Reads the dashboard summary.
 *
 * `providedIn: 'root'` rather than route-provided: the resolver runs before any
 * component exists, so a provider that lived on the page would not be up yet.
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);

  salesChart(days: SalesChartRange = 7): Observable<SalesChartPoint[]> {
    return this.api.get<SalesChartPoint[]>('/dashboard/sales-chart', { days });
  }

  /**
   * `GET /dashboard/summary` → the seven numbers the KPI tiles print.
   *
   * The response reaches the caller already unwrapped from the
   * `{ data, meta, message }` envelope (`ApiService.get`), and already
   * normalised to an `ApiError` on failure (`toApiError`), so neither concern
   * appears here.
   */
  summary(): Observable<DashboardSummary> {
    return this.api.get<DashboardSummary>('/dashboard/summary');
  }

  recentOrders(): Observable<DashboardRecentOrder[]> {
    return this.api.get<DashboardRecentOrder[]>('/dashboard/recent-orders');
  }
}
