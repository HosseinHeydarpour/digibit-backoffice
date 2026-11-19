// src/app/features/orders/services/orders.service.ts
//
// The orders API surface (BO-H01; BO-H09 adds the mutation methods on top).
//
// Same contract as the products service: every call goes through `ApiService`
// (the only place `X-Mock` is attached), `list` returns a `Page` because the
// table needs the server's total, and `buildQuery` is the ONE serializer from
// query state to wire parameters — pure and exported so its spec needs no HTTP.
//
// `from`/`to` already travel here even though the filter bar is BO-H02: the
// wire contract is settled now so the picker only converts Jalali → UTC millis
// and calls `list`, with no second URL builder appearing in a component.

import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/services/api';
import type { EntityId, Page } from '@shared/models';
import { Observable } from 'rxjs';

import type { Order, OrderListItem, OrderQuery } from '../models/order.model';

const ORDERS_PATH = '/orders';

/**
 * Serialise the list state into the query string the API expects.
 *
 * Rules, shared with the products builder so the two lists behave alike:
 * - `null`, `undefined`, empty and whitespace-only text are absent, not `?query=`.
 * - `page`/`pageSize` only travel when positive; `0` is an uninitialised
 *   component, and the server should use its default.
 * - `from`/`to` only travel when finite and non-negative (UTC millis).
 * - `dir` only accompanies a `sort`; a direction alone says nothing.
 */
export function buildQuery(query: OrderQuery = {}): HttpParams {
  let params = new HttpParams();

  const setText = (key: string, value: string | null | undefined): void => {
    if (value === null || value === undefined) {
      return;
    }

    const text = value.trim();
    if (text === '') {
      return;
    }

    params = params.set(key, text);
  };

  const setPositive = (key: string, value: number | undefined): void => {
    if (value === undefined || !Number.isFinite(value) || value <= 0) {
      return;
    }

    params = params.set(key, String(value));
  };

  const setMillis = (key: string, value: number | undefined): void => {
    if (value === undefined || !Number.isFinite(value) || value < 0) {
      return;
    }

    params = params.set(key, String(value));
  };

  setText('query', query.query);
  setText('status', query.status);
  setMillis('from', query.from);
  setMillis('to', query.to);
  setPositive('page', query.page);
  setPositive('pageSize', query.pageSize);
  setText('sort', query.sort);

  if (query.sort) {
    setText('dir', query.dir ?? 'asc');
  }

  return params;
}

/**
 * Orders reads (BO-H01).
 *
 * `get` returns the full record — items, address, payment, history — because
 * the detail page binds every card from one response. Failures arrive as the
 * global `ApiError`: a missing id is `status: 404`, which the detail resolver
 * turns into the 404 page while any other failure renders the retry block.
 */
@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly api = inject(ApiService);

  /** `GET /orders?query=…&status=…&page=…` → one page of table rows. */
  list(query: OrderQuery = {}): Observable<Page<OrderListItem>> {
    return this.api.getPage<OrderListItem>(ORDERS_PATH, buildQuery(query));
  }

  /** `GET /orders/:id` → the full order for the detail page. */
  get(id: EntityId): Observable<Order> {
    return this.api.get<Order>(`${ORDERS_PATH}/${encodeURIComponent(id)}`);
  }
}
