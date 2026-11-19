// src/app/features/customers/customer-list/customer-paging.ts
//
// The whole list state (query, status, page, size, sort) and its two-way
// translation to the URL and to the API (BO-I01 tc 7).
//
// Features never import from each other, so this is the customers module's own
// copy of the paging shape the products and orders lists use. The sort union is
// genuinely different (one sortable column here), and a third copy is still
// cheaper than a shared abstraction nobody else needs yet.
//
// URL NAMES vs API NAMES
// ----------------------
// The URL uses `size`; the API uses `pageSize`. The mapping lives here, next to
// the defaults.
//
// TRACE: `/customers?query=مریم&status=blocked&page=2&size=10&sort=createdAt&dir=desc`
//   1. `stateFromParams` → { query: 'مریم', status: 'blocked', page: 2,
//      pageSize: 10, sort: 'createdAt', dir: 'desc' }.
//   2. `stateToQuery` → the same values with `pageSize` (for `buildCustomerQuery`).
//   3. `stateToParams` → { page: '2', size: '10', query: 'مریم',
//      status: 'blocked', sort: 'createdAt', dir: 'desc' }.
//   4. A refresh re-runs step 1, so the sender and the receiver see one view.

import type { ParamMap } from '@angular/router';
import type { SortOrder } from '@shared/models';

import type { CustomerQuery, CustomerSortField, CustomerStatus } from '../models/customer.model';

/** The three sizes the paginator offers (BO-I01 tc 6). */
export type PageSize = 10 | 20 | 50;

export const DEFAULT_PAGE_SIZE: PageSize = 20;

export const PAGE_SIZE_OPTIONS: readonly PageSize[] = [10, 20, 50];

/** What the table shows before any filter or paging is applied. */
export interface CustomerListState {
  /** Free text over name, mobile and email; already trimmed. */
  readonly query: string;
  /** `''` is the «همه» option — an explicit value, so the URL drops the key. */
  readonly status: CustomerStatus | '';
  /** 1-based, matching the URL and the API. */
  readonly page: number;
  readonly pageSize: PageSize;
  readonly sort: CustomerSortField | null;
  readonly dir: SortOrder;
}

export const DEFAULT_CUSTOMER_STATE: CustomerListState = {
  query: '',
  status: '',
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  sort: null,
  dir: 'asc',
};

/** Narrow a URL value to the closed status set. */
export function isCustomerStatus(value: string | null): value is CustomerStatus {
  return value === 'active' || value === 'blocked';
}

/** Narrow an arbitrary number to one of the three selectable sizes. */
export function isPageSize(value: number): value is PageSize {
  return value === 10 || value === 20 || value === 50;
}

/**
 * Read the state out of a URL.
 *
 * Invalid values fall back instead of reaching the API: `page=0` becomes 1,
 * `size=25` becomes 20, an unknown `status` clears the filter, and an unknown
 * `sort` drops both sort and direction. A stale bookmark must never produce an
 * untyped query.
 */
export function stateFromParams(params: ParamMap): CustomerListState {
  const rawPage = Number(params.get('page'));
  const rawSize = Number(params.get('size'));
  const status = params.get('status');
  const sort = params.get('sort');
  const sortField: CustomerSortField | null = sort === 'createdAt' ? 'createdAt' : null;

  return {
    query: (params.get('query') ?? '').trim(),
    status: isCustomerStatus(status) ? status : '',
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    pageSize: isPageSize(rawSize) ? rawSize : DEFAULT_PAGE_SIZE,
    sort: sortField,
    dir: sortField !== null && params.get('dir') === 'desc' ? 'desc' : 'asc',
  };
}

/** The service query: one serializer owns the `pageSize`/`status` mapping. */
export function stateToQuery(state: CustomerListState): CustomerQuery {
  return {
    query: state.query === '' ? undefined : state.query,
    status: state.status === '' ? undefined : state.status,
    page: state.page,
    pageSize: state.pageSize,
    sort: state.sort ?? undefined,
    dir: state.sort ? state.dir : undefined,
  };
}

/**
 * `queryParams` for `Router.navigate`.
 *
 * Defaults are `null` (removed), so a clean list stays `/customers` instead of
 * `?page=1&size=20`. `queryParamsHandling: 'merge'` keeps keys this task does
 * not own.
 */
export function stateToParams(state: CustomerListState): Record<string, string | null> {
  return {
    query: state.query === '' ? null : state.query,
    status: state.status === '' ? null : state.status,
    page: state.page > 1 ? String(state.page) : null,
    size: state.pageSize === DEFAULT_PAGE_SIZE ? null : String(state.pageSize),
    sort: state.sort,
    dir: state.sort ? state.dir : null,
  };
}

/** True when two states would produce the same request and the same URL. */
export function stateEqual(a: CustomerListState, b: CustomerListState): boolean {
  return (
    a.query === b.query &&
    a.status === b.status &&
    a.page === b.page &&
    a.pageSize === b.pageSize &&
    a.sort === b.sort &&
    a.dir === b.dir
  );
}

/** True when a filter narrows the result set (used by the empty-state copy). */
export function hasActiveFilters(state: CustomerListState): boolean {
  return state.query !== '' || state.status !== '';
}

/** At least one page, even when the result set is empty. */
export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize)));
}

/**
 * The compact page list. `null` is an ellipsis; up to seven pages every number
 * is shown, above that first, last and the active page ±1.
 */
export function pageWindow(current: number, pages: number): readonly (number | null)[] {
  const count = Math.max(1, pages);
  const active = Math.min(Math.max(1, current), count);

  if (count <= 7) {
    return Array.from({ length: count }, (_, index) => index + 1);
  }

  const visible = new Set<number>(
    [1, count, active - 1, active, active + 1].filter((page) => page >= 1 && page <= count),
  );
  const sorted = [...visible].sort((a, b) => a - b);
  const result: (number | null)[] = [];

  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (index > 0 && page - previous > 1) {
      result.push(null);
    }
    result.push(page);
  });

  return result;
}
