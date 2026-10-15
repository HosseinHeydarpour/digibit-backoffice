export type SortOrder = 'asc' | 'desc';

/**
 * One sortable column's state.
 *
 * `field` is the API's field name (English, e.g. `price`), never the Persian
 * column header — the header is a display concern.
 */
export interface SortState {
  field: string;
  order: SortOrder;
}

/** PrimeNG's p-table emits `1` for ascending and `-1` for descending. */
export function fromPrimeSort(order: number | undefined): SortOrder {
  return order === -1 ? 'desc' : 'asc';
}

/** The reverse, for feeding `p-table`'s `sortOrder` input. */
export function toPrimeSort(order: SortOrder): number {
  return order === 'desc' ? -1 : 1;
}
