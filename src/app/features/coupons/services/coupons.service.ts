// src/app/features/coupons/services/coupons.service.ts
//
// The coupons API surface (BO-J01; J07 formalises the service task, but the
// list, the form and the toggle cannot exist without it).
//
// Same contract as every other module: `ApiService` is the only transport
// (it attaches `X-Mock`), `list` returns a `Page`, and `buildCouponQuery` is a
// pure serializer so the list's query is tested without HTTP.

import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/services/api';
import type { EntityId, Page } from '@shared/models';
import { Observable } from 'rxjs';

import type { Coupon, CouponDeleteResult, CouponInput, CouponQuery } from '../models/coupon.model';

const COUPONS_PATH = '/coupons';

/**
 * Serialise the list state into the query string the API expects.
 *
 * Text is trimmed and omitted when empty, `page`/`pageSize` only travel when
 * positive, and an absent status means «همه» (no key at all).
 *
 * TRACE: `{ query: ' OFF ', status: 'expired', page: 2, pageSize: 10 }`
 *   → `?query=OFF&status=expired&page=2&pageSize=10`
 *     (the server derives `expired` from `to < now`, the client never sends it).
 */
export function buildCouponQuery(query: CouponQuery = {}): HttpParams {
  let params = new HttpParams();

  const text = query.query?.trim();
  if (text) {
    params = params.set('query', text);
  }

  if (query.status) {
    params = params.set('status', query.status);
  }

  if (query.page !== undefined && query.page > 0) {
    params = params.set('page', String(query.page));
  }

  if (query.pageSize !== undefined && query.pageSize > 0) {
    params = params.set('pageSize', String(query.pageSize));
  }

  return params;
}

/**
 * Coupons reads and writes (BO-J01..J04).
 *
 * A duplicate code is a 422 with `fields.code`; the form maps it under the
 * input. The server stays the authority because two tabs can race.
 */
@Injectable({ providedIn: 'root' })
export class CouponsService {
  private readonly api = inject(ApiService);

  /** `GET /coupons?query=…&status=…&page=…` → one page of coupons. */
  list(query: CouponQuery = {}): Observable<Page<Coupon>> {
    return this.api.getPage<Coupon>(COUPONS_PATH, buildCouponQuery(query));
  }

  /** `GET /coupons/:id` → one coupon, for the edit dialog. */
  get(id: EntityId): Observable<Coupon> {
    return this.api.get<Coupon>(`${COUPONS_PATH}/${encodeURIComponent(id)}`);
  }

  /** `POST /coupons` → the created row (201). */
  create(input: CouponInput): Observable<Coupon> {
    return this.api.post<Coupon>(COUPONS_PATH, input);
  }

  /** `PUT /coupons/:id` → the updated row; usage counters stay server-owned. */
  update(id: EntityId, input: CouponInput): Observable<Coupon> {
    return this.api.put<Coupon>(`${COUPONS_PATH}/${encodeURIComponent(id)}`, input);
  }

  /**
   * `DELETE /coupons/:id` → either `{ deleted: true }` (unused coupon removed)
   * or `{ deleted: false, coupon }` where the used coupon was switched off.
   * The server decides, because only it knows the redemption count.
   */
  remove(id: EntityId): Observable<CouponDeleteResult> {
    return this.api.delete<CouponDeleteResult>(`${COUPONS_PATH}/${encodeURIComponent(id)}`);
  }

  /**
   * `PATCH /coupons/:id/status` — the optimistic toggle's request.
   *
   * The body carries the target state, not a flip. Enabling an expired or
   * exhausted coupon answers 409; the client refuses those before asking too.
   */
  setStatus(id: EntityId, isActive: boolean): Observable<Coupon> {
    return this.api.patch<Coupon>(`${COUPONS_PATH}/${encodeURIComponent(id)}/status`, { isActive });
  }
}
