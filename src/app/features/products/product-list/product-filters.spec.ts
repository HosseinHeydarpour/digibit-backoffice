import { convertToParamMap } from '@angular/router';

import {
  EMPTY_FILTERS,
  filtersEqual,
  filtersFromParams,
  filtersToQuery,
  filtersToQueryParams,
  hasActiveFilters,
} from './product-filters';
import type { ProductFilters } from './product-filters';

describe('product filters (BO-F03)', () => {
  it('tc 5: reads the four filters out of the URL', () => {
    const params = convertToParamMap({
      query: 'سونی',
      category: '3',
      brand: '5',
      status: 'draft',
    });

    expect(filtersFromParams(params)).toEqual({
      query: 'سونی',
      category: '3',
      brand: '5',
      status: 'draft',
    });
  });

  it('tc 9: an empty URL means no filters (all results)', () => {
    expect(filtersFromParams(convertToParamMap({}))).toEqual(EMPTY_FILTERS);
  });

  it('ignores an unknown status instead of sending it to the API', () => {
    expect(filtersFromParams(convertToParamMap({ status: 'deleted' })).status).toBe('');
  });

  it('tc 8: maps URL names to API names and trims the text', () => {
    const filters: ProductFilters = {
      query: '  هدفون  ',
      category: '2',
      brand: '5',
      status: 'published',
    };

    expect(filtersToQuery(filters)).toEqual({
      query: 'هدفون',
      categoryId: '2',
      brandId: '5',
      status: 'published',
    });
  });

  it('tc 8/9: an empty filter produces an empty query, not empty strings', () => {
    expect(filtersToQuery(EMPTY_FILTERS)).toEqual({
      query: undefined,
      categoryId: null,
      brandId: null,
      status: null,
    });
  });

  it('tc 5/7: serialises URL params and uses null for a cleared key', () => {
    expect(filtersToQueryParams(EMPTY_FILTERS)).toEqual({
      query: null,
      category: null,
      brand: null,
      status: null,
    });

    expect(
      filtersToQueryParams({
        query: '  سونی  ',
        category: '3',
        brand: '',
        status: 'inactive',
      }),
    ).toEqual({
      query: 'سونی',
      category: '3',
      brand: null,
      status: 'inactive',
    });
  });

  it('tc 7: hasActiveFilters is true for any non-empty filter and false for whitespace', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: '   ' })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: 'سونی' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, category: '3' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, brand: '5' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, status: 'draft' })).toBe(true);
  });

  it('compares states by value so a redundant fetch can be skipped', () => {
    expect(filtersEqual(EMPTY_FILTERS, { ...EMPTY_FILTERS })).toBe(true);
    expect(
      filtersEqual({ ...EMPTY_FILTERS, query: 'سونی ' }, { ...EMPTY_FILTERS, query: 'سونی' }),
    ).toBe(true);
    expect(filtersEqual(EMPTY_FILTERS, { ...EMPTY_FILTERS, status: 'draft' })).toBe(false);
  });
});
