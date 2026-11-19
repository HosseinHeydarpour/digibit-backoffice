// src/app/features/customers/services/customers.service.ts
//
// The customers API surface (BO-I04).
//
// Same contract as the orders service: every call goes through `ApiService`
// (the only place `X-Mock` is attached), `list` returns a `Page` so the table
// owns the server's total, and `buildCustomerQuery` is the ONE serializer from
// state to wire parameters.
//
// WHY `lastOrders` LIVES HERE AND NOT IN THE ORDERS SERVICE
// --------------------------------------------------------
// A feature may not import from another feature, but the profile needs the
// customer's recent orders. Calling `/orders?customerId=` from THIS service
// keeps the dependency pointing at the API contract instead of at
// `features/orders`, and the response is projected onto the one model this
// feature needs. The mock filters the same parameter, so the order is the same
// row the orders table would show.

import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/services/api';
import type { EntityId, Page } from '@shared/models';
import { Observable } from 'rxjs';

import type {
  Customer,
  CustomerListItem,
  CustomerOrderSummary,
  CustomerQuery,
} from '../models/customer.model';

const CUSTOMERS_PATH = '/customers';
const ORDERS_PATH = '/orders';

/** The profile's recent-orders count; the full history stays on `/orders`. */
export const RECENT_ORDERS_LIMIT = 5;

/**
 * Serialise the list state into the query string the API expects.
 *
 * Rules, shared with the orders builder:
 * - `null`, `undefined`, empty and whitespace-only text are absent.
 * - `page`/`pageSize` only travel when positive.
 * - `status` only travels when the select is not «همه».
 * - `dir` only accompanies a `sort`.
 *
 * TRACE: `{ query: ' علی ', status: 'blocked', page: 2, pageSize: 10, sort: 'createdAt', dir: 'desc' }`
 *   → `?query=علی&status=blocked&page=2&pageSize=10&sort=createdAt&dir=desc`
 *     (the whitespace is trimmed before it reaches the URL, so `?query=%20` is
 *     not a filter the server has to guess about).
 */
export function buildCustomerQuery(query: CustomerQuery = {}): HttpParams {
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

  setText('query', query.query);
  setText('status', query.status);
  setPositive('page', query.page);
  setPositive('pageSize', query.pageSize);
  setText('sort', query.sort);

  if (query.sort) {
    setText('dir', query.dir ?? 'asc');
  }

  return params;
}

/**
 * Customers reads and the one account-status write (BO-I03/I04).
 *
 * Failures arrive as the global `ApiError`; a missing id is a 404, which the
 * profile resolver turns into the 404 page.
 */
@Injectable({ providedIn: 'root' })
export class CustomersService {
  private readonly api = inject(ApiService);

  /** `GET /customers?query=…&status=…&page=…` → one page of table rows. */
  list(query: CustomerQuery = {}): Observable<Page<CustomerListItem>> {
    return this.api.getPage<CustomerListItem>(CUSTOMERS_PATH, buildCustomerQuery(query));
  }

  /** `GET /customers/:id` → the profile with every address. */
  get(id: EntityId): Observable<Customer> {
    return this.api.get<Customer>(`${CUSTOMERS_PATH}/${encodeURIComponent(id)}`);
  }

  /**
   * The profile's latest orders, newest first.
   *
   * `pageSize` is explicit so the profile can ask for five while the list page
   * keeps its own 10/20/50 choice; the server's `total` is ignored here because
   * the customer record already carries the full `orderCount`.
   */
  lastOrders(id: EntityId): Observable<Page<CustomerOrderSummary>> {
    return this.api.getPage<CustomerOrderSummary>(ORDERS_PATH, {
      customerId: id,
      page: 1,
      pageSize: RECENT_ORDERS_LIMIT,
      sort: 'createdAt',
      dir: 'desc',
    });
  }

  /**
   * `PATCH /customers/:id/status` — the optimistic toggle's request.
   *
   * The body says what the account should BECOME (`blocked: true`), not "flip
   * it": two admin tabs toggling the same customer must not race into a state
   * neither of them asked for.
   */
  setStatus(id: EntityId, blocked: boolean): Observable<Customer> {
    return this.api.patch<Customer>(`${CUSTOMERS_PATH}/${encodeURIComponent(id)}/status`, {
      blocked,
    });
  }
}
