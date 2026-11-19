// src/app/features/coupons/coupon-list/coupon-paging.ts
//
// The coupons list's small state (BO-J01): status filter, page and size.
//
// Deliberately NOT in the URL. There is one select and one page number, and a
// shareable coupon filter is not a requirement; the products and orders lists
// needed the URL because a filtered product view is something people send to
// each other. A CRUD list does not. If that changes, this file already owns the
// shape that `Router.queryParams` would carry.
//
// `pageWindow` mirrors the orders/products paginator: up to seven pages shows
// every number, above that first, last and the active page ±1.

import type { CouponStatus } from '../models/coupon.model';

export type PageSize = 10 | 20 | 50;

export const DEFAULT_PAGE_SIZE: PageSize = 10;

export const PAGE_SIZE_OPTIONS: readonly PageSize[] = [10, 20, 50];

export interface CouponListState {
  readonly status: CouponStatus | '';
  readonly page: number;
  readonly pageSize: PageSize;
}

export const DEFAULT_COUPON_STATE: CouponListState = {
  status: '',
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

export function isPageSize(value: number): value is PageSize {
  return value === 10 || value === 20 || value === 50;
}

/** The service query: the «همه» status is `undefined`, never `''`. */
export function stateToQuery(state: CouponListState): {
  status: CouponStatus | undefined;
  page: number;
  pageSize: PageSize;
} {
  return {
    status: state.status === '' ? undefined : state.status,
    page: state.page,
    pageSize: state.pageSize,
  };
}

export function stateEqual(a: CouponListState, b: CouponListState): boolean {
  return a.status === b.status && a.page === b.page && a.pageSize === b.pageSize;
}

export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize)));
}

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
