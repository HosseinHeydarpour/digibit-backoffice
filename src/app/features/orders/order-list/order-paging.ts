// src/app/features/orders/order-list/order-paging.ts
//
// The page/size/sort half of the orders list state (BO-H01).
//
// WHY A COPY OF THE PRODUCTS MODULE, NOT AN IMPORT
// ------------------------------------------------
// Features never import from each other (AGENTS.md), and the sort union is
// genuinely different here: orders sort by `createdAt` and `total`, products
// by name/price/stock/createdAt. Promoting a generic paging helper to shared/
// for two callers would be a premature abstraction; if a third list appears,
// that is the moment to lift the common parts.
//
// URL NAMES vs API NAMES
// ----------------------
// The URL uses `size`; the API uses `pageSize`. The mapping lives here, next
// to the defaults — the same rule the products list follows.
//
// This file is NOT under `models/`: it exports runtime functions, and
// `features/*/models/` stays types-only.

import type { ParamMap } from '@angular/router';
import type { SortOrder } from '@shared/models';

import type { OrderQuery, OrderSortField } from '../models/order.model';

/** The three sizes the panel offers in the paginator. */
export type PageSize = 10 | 20 | 50;

/** The default when the URL has no `size` — also the API's default page size. */
export const DEFAULT_PAGE_SIZE: PageSize = 20;

export const PAGE_SIZE_OPTIONS: readonly PageSize[] = [10, 20, 50];

/** The neutral page state: first page, default size, no sort. */
export const DEFAULT_PAGING: OrderPaging = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  sort: null,
  dir: 'asc',
};

export interface OrderPaging {
  /** 1-based, matching the URL and the API. */
  readonly page: number;
  readonly pageSize: PageSize;
  readonly sort: OrderSortField | null;
  readonly dir: SortOrder;
}

/** Narrow a URL/API value to the closed sort union. */
export function isSortField(value: string | null): value is OrderSortField {
  return value === 'createdAt' || value === 'total';
}

/** Narrow an arbitrary number to one of the three selectable sizes. */
export function isPageSize(value: number): value is PageSize {
  return value === 10 || value === 20 || value === 50;
}

/**
 * Read paging/sort out of a URL.
 *
 * TRACE: `/orders?page=2&size=10&sort=total&dir=desc`
 *   → { page: 2, pageSize: 10, sort: 'total', dir: 'desc' }
 *
 * Invalid values fall back instead of reaching the API: `page=0`/`page=2.5`
 * become 1, `size=25` becomes 20, and an unknown `sort` drops both sort and
 * direction. A stale bookmark must never produce an untyped query.
 */
export function pagingFromParams(params: ParamMap): OrderPaging {
  const rawPage = Number(params.get('page'));
  const rawSize = Number(params.get('size'));
  const sort = params.get('sort');
  const dir = params.get('dir');
  const sortField = isSortField(sort) ? sort : null;

  return {
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : DEFAULT_PAGING.page,
    pageSize: isPageSize(rawSize) ? rawSize : DEFAULT_PAGING.pageSize,
    sort: sortField,
    dir: sortField !== null && dir === 'desc' ? 'desc' : 'asc',
  };
}

/**
 * Turn the UI state into the service query.
 *
 * `page`/`pageSize` are always sent; `sort`/`dir` are omitted when there is no
 * sort, so `buildQuery` does not produce `?sort=undefined`.
 */
export function pagingToQuery(paging: OrderPaging): OrderQuery {
  return {
    page: paging.page,
    pageSize: paging.pageSize,
    sort: paging.sort ?? undefined,
    dir: paging.sort ? paging.dir : undefined,
  };
}

/**
 * Turn the UI state into `queryParams` for `Router.navigate`.
 *
 * Defaults are `null` (removed) so a clean list stays `/orders`, not
 * `?page=1&size=20`. `dir` only accompanies a sort, and
 * `queryParamsHandling: 'merge'` keeps BO-H02's future filters intact.
 */
export function pagingToQueryParams(paging: OrderPaging): Record<string, string | null> {
  return {
    page: paging.page > 1 ? String(paging.page) : null,
    size: paging.pageSize === DEFAULT_PAGE_SIZE ? null : String(paging.pageSize),
    sort: paging.sort,
    dir: paging.sort ? paging.dir : null,
  };
}

/** True when two paging states would produce the same request. */
export function pagingEqual(a: OrderPaging, b: OrderPaging): boolean {
  return a.page === b.page && a.pageSize === b.pageSize && a.sort === b.sort && a.dir === b.dir;
}

/** At least one page, even when the result set is empty. */
export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize)));
}

/**
 * The compact page list for the paginator.
 *
 * `null` is an ellipsis. Up to seven pages every number is shown; above that
 * the window is first, last, and the active page ±1 — compact enough for a
 * phone-width footer. The active page is clamped so a stale `?page=99` still
 * renders a usable control.
 *
 * TRACE: pageWindow(5, 10) → [1, null, 4, 5, 6, null, 10]
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
