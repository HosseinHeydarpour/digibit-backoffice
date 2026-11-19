import type { ParamMap } from '@angular/router';
import type { OrderStatus } from '@shared/models/status-badge.model';

import type { OrderQuery } from '../models/order.model';

/** The filter bar's own state (BO-H02); paging/sort stay in `order-paging.ts`. */
export interface OrderFilters {
  readonly query: string;
  /** Set only by the profile's «مشاهده همه سفارش‌ها» link, not by the filter bar. */
  readonly customerId: string;
  readonly status: OrderStatus | '';
  /** Gregorian `YYYY-MM-DD` as the Jalali control stores it. */
  readonly from: string | null;
  readonly to: string | null;
}

export const EMPTY_FILTERS: OrderFilters = {
  query: '',
  customerId: '',
  status: '',
  from: null,
  to: null,
};

const STATUSES: readonly OrderStatus[] = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
];

/** `YYYY-MM-DD` only — a pasted ISO timestamp is rejected, not half-parsed. */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function readDate(value: string | null): string | null {
  return value !== null && DATE_PATTERN.test(value) ? value : null;
}

/** Read the filter keys out of the URL; unknown statuses fall back to «همه». */
export function filtersFromParams(params: ParamMap): OrderFilters {
  const status = params.get('status');

  return {
    query: (params.get('query') ?? '').trim(),
    customerId: (params.get('customerId') ?? '').trim(),
    status: STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : '',
    from: readDate(params.get('from')),
    to: readDate(params.get('to')),
  };
}

/** Start of the chosen day, local time — the range the user picked includes it. */
function startOfDay(date: string): number {
  return new Date(`${date}T00:00:00`).getTime();
}

/** End of the chosen day, so «تا ۲۸ آبان» includes everything that day. */
function endOfDay(date: string): number {
  return new Date(`${date}T23:59:59.999`).getTime();
}

/**
 * Filters → the wire query.
 *
 * TRACE — `{ query: '۱۴۰۲۳', status: 'shipped', from: '2026-11-01', to: '2026-11-10' }`:
 *   1. `query` and `status` travel verbatim (trimmed).
 *   2. `from` becomes the local start of 1 Nov; `to` the last millisecond of
 *      10 Nov, so the range is inclusive at both ends, which is what a Jalali
 *      «از/تا» reads like.
 *   3. An inverted range sends NEITHER bound and the UI blocks the request
 *      before it is built (see `dateRangeInvalid`).
 */
export function filtersToQuery(filters: OrderFilters): OrderQuery {
  const invalid = dateRangeInvalid(filters);

  return {
    query: filters.query.trim(),
    customerId: filters.customerId === '' ? undefined : filters.customerId,
    status: filters.status === '' ? undefined : filters.status,
    from: invalid || filters.from === null ? undefined : startOfDay(filters.from),
    to: invalid || filters.to === null ? undefined : endOfDay(filters.to),
  };
}

/** Non-empty filters as URL keys; the caller merges them with paging/sort. */
export function filtersToQueryParams(filters: OrderFilters): Record<string, string> {
  const params: Record<string, string> = {};

  if (filters.query.trim() !== '') params['query'] = filters.query.trim();
  if (filters.customerId !== '') params['customerId'] = filters.customerId;
  if (filters.status !== '') params['status'] = filters.status;
  if (filters.from !== null) params['from'] = filters.from;
  if (filters.to !== null) params['to'] = filters.to;

  return params;
}

export function filtersEqual(a: OrderFilters, b: OrderFilters): boolean {
  return (
    a.query === b.query &&
    a.customerId === b.customerId &&
    a.status === b.status &&
    a.from === b.from &&
    a.to === b.to
  );
}

/** A range whose end is before its start (BO-H02 tc 10). */
export function dateRangeInvalid(filters: OrderFilters): boolean {
  return filters.from !== null && filters.to !== null && filters.to < filters.from;
}

export function hasActiveFilters(filters: OrderFilters): boolean {
  return (
    filters.query.trim() !== '' ||
    filters.customerId !== '' ||
    filters.status !== '' ||
    filters.from !== null ||
    filters.to !== null
  );
}
