// src/app/features/products/product-list/product-filters.ts
//
// The URL ↔ filter-state translator for the products list (BO-F03).
//
// WHY A PURE MODULE AND NOT METHODS ON THE COMPONENT
// --------------------------------------------------
// The rules below are the whole feature: which URL keys exist, how an empty
// value is represented, and how a category id becomes `categoryId` for the API.
// Keeping them in pure functions means the spec can pin every rule without a
// TestBed, and BO-F04 can extend the same state with page/sort instead of
// growing a second URL builder inside the page.
//
// URL NAMES vs API NAMES
// ----------------------
// The URL is what a human shares: `?x=…&category=…&brand=…&status=…`. The API
// speaks `categoryId`/`brandId`. The mapping lives here, in one place.
//
// This file is NOT under `models/`: it exports runtime functions, and AGENTS.md
// keeps `features/*/models/` types-only (a runtime value in a models file can
// read back `undefined` when two chunks share the module).

import type { ParamMap } from '@angular/router';

import type { ProductQuery, ProductStatus } from '../models/product.model';

/** The four filters the list exposes. Empty string = "no filter". */
export interface ProductFilters {
  readonly query: string;
  readonly category: string;
  readonly brand: string;
  readonly status: ProductStatus | '';
}

/** The "no filters" state; also what a refresh of `/products` restores. */
export const EMPTY_FILTERS: ProductFilters = {
  query: '',
  category: '',
  brand: '',
  status: '',
};

/** Narrow an arbitrary query-string value to the closed status union. */
export function isProductStatus(value: string | null): value is ProductStatus {
  return value === 'published' || value === 'draft' || value === 'inactive';
}

/**
 * Read the four filters out of a URL.
 *
 * TRACE: `/products?query=سونی&category=3&brand=5&status=draft`
 *   → { query: 'سونی', category: '3', brand: '5', status: 'draft' }
 *
 * An unknown status (`?status=deleted`) is ignored rather than cast: a stale
 * bookmark must fall back to "all statuses", not send an invalid value to the
 * API. Missing keys become `''` so the template never binds `null`.
 */
export function filtersFromParams(params: ParamMap): ProductFilters {
  const status = params.get('status');

  return {
    query: params.get('query') ?? '',
    category: params.get('category') ?? '',
    brand: params.get('brand') ?? '',
    status: isProductStatus(status) ? status : '',
  };
}

/**
 * Turn the UI state into the service query.
 *
 * `category`/`brand` are the URL names; `categoryId`/`brandId` are the API
 * names. Empty selections become `null` so `buildQuery` drops them instead of
 * sending `?categoryId=`.
 */
export function filtersToQuery(filters: ProductFilters): ProductQuery {
  return {
    query: filters.query.trim() || undefined,
    categoryId: filters.category || null,
    brandId: filters.brand || null,
    status: filters.status || null,
  };
}

/**
 * Turn the UI state into `queryParams` for `Router.navigate`.
 *
 * Every key is present, with `null` for "remove it": with
 * `queryParamsHandling: 'merge'`, a null removes that key while preserving any
 * parameter this task does not own (BO-F04's `page`/`sort`). That is why the
 * clear button can reset four filters without wiping pagination.
 */
export function filtersToQueryParams(filters: ProductFilters): Record<string, string | null> {
  return {
    query: filters.query.trim() || null,
    category: filters.category || null,
    brand: filters.brand || null,
    status: filters.status || null,
  };
}

/** True when at least one filter would narrow the result set. */
export function hasActiveFilters(filters: ProductFilters): boolean {
  return (
    filters.query.trim() !== '' ||
    filters.category !== '' ||
    filters.brand !== '' ||
    filters.status !== ''
  );
}

/** Two states are equal when every filter is equal — used to skip a redundant fetch. */
export function filtersEqual(a: ProductFilters, b: ProductFilters): boolean {
  return (
    a.query.trim() === b.query.trim() &&
    a.category === b.category &&
    a.brand === b.brand &&
    a.status === b.status
  );
}
