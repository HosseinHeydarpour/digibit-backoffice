/**
 * The response envelope every endpoint wraps its payload in.
 * Mirrors ARCHITECTURE.md §4 exactly — `data` plus an optional `meta` and `message`.
 */
export interface ApiResponse<T> {
  data: T;
  meta?: PageMeta;
  message?: string;
}

/** Paging information. Present on list endpoints, absent on single-resource ones. */
export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * A paged result: the payload plus its paging metadata.
 *
 * Note this is NOT the wire shape. The wire shape is `ApiResponse<T[]>`; the
 * ApiService flattens it into this so callers never touch `meta` and `data`
 * separately at the same level.
 */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
