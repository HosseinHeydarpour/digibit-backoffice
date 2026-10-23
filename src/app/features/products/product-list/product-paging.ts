// src/app/features/products/product-list/product-paging.ts
//
// The page/size/sort half of the list state (BO-F04).
//
// WHY A SEPARATE PURE MODULE
// --------------------------
// BO-F03 already owns the four filters in `product-filters.ts`. Paging and
// sorting are a different concern with their own rules (1-based page numbers,
// the three allowed sizes, the closed sort-field union, and the compact page
// window). Keeping them here means the component only combines two tested pure
// functions, and the F04 spec can pin every rule without a TestBed.
//
// URL NAMES vs API NAMES
// ----------------------
// The URL uses `size` (short, shareable); the API uses `pageSize` (the envelope's
// name). The mapping lives here, next to the defaults.
//
// This file is NOT under `models/`: it exports runtime functions, and AGENTS.md
// keeps `features/*/models/` types-only.

import type { ParamMap } from '@angular/router';
import type { SortOrder } from '@shared/models';

import type { ProductQuery, ProductSortField } from '../models/product.model';

/** The three sizes the panel offers in the paginator. */
export type PageSize = 10 | 20 | 50;

/** The default when the URL has no `size` — also the API's default page size. */
export const DEFAULT_PAGE_SIZE: PageSize = 20;

export const PAGE_SIZE_OPTIONS: readonly PageSize[] = [10, 20, 50];

/** The neutral page state: first page, default size, no sort. */
export const DEFAULT_PAGING: ProductPaging = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  sort: null,
  dir: 'asc',
};

export interface ProductPaging {
  /** 1-based, matching the URL and the API. */
  readonly page: number;
  readonly pageSize: PageSize;
  readonly sort: ProductSortField | null;
  readonly dir: SortOrder;
}

/** Narrow a URL/API value to the closed sort union. */
export function isSortField(value: string | null): value is ProductSortField {
  return value === 'name' || value === 'price' || value === 'stock' || value === 'createdAt';
}

/** Narrow an arbitrary number to one of the three selectable sizes. */
export function isPageSize(value: number): value is PageSize {
  return value === 10 || value === 20 || value === 50;
}

/**
 * Read paging/sort out of a URL.
 *
 * TRACE: `/products?page=3&size=10&sort=price&dir=desc`
 *   → { page: 3, pageSize: 10, sort: 'price', dir: 'desc' }
 *
 * Invalid values fall back instead of reaching the API: `page=0`/`page=2.5`
 * become 1, `size=25` becomes 20, and an unknown `sort` drops both sort and
 * direction. A stale bookmark must never produce an untyped query.
 */
export function pagingFromParams(params: ParamMap): ProductPaging {
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
export function pagingToQuery(paging: ProductPaging): ProductQuery {
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
 * Defaults are `null` (removed) so a clean list stays `/products`, not
 * `?page=1&size=20`. `sort` is written only when active; `dir` only accompanies a
 * sort. `queryParamsHandling: 'merge'` then preserves BO-F03's filters.
 */
export function pagingToQueryParams(paging: ProductPaging): Record<string, string | null> {
  return {
    page: paging.page > 1 ? String(paging.page) : null,
    size: paging.pageSize === DEFAULT_PAGE_SIZE ? null : String(paging.pageSize),
    sort: paging.sort,
    dir: paging.sort ? paging.dir : null,
  };
}

/** True when two paging states would produce the same request. */
export function pagingEqual(a: ProductPaging, b: ProductPaging): boolean {
  return a.page === b.page && a.pageSize === b.pageSize && a.sort === b.sort && a.dir === b.dir;
}

/** At least one page, even when the result set is empty. */
export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize)));
}

/**
 * The compact page list for the paginator.
 *
 * `null` is an ellipsis. Up to seven pages every number is shown; above that the
 * window is first, last, and the active page ±1 — which is what keeps the
 * control compact on a phone-width footer (tc 9). The active page is clamped so
 * a stale `?page=99` still renders a usable control.
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
