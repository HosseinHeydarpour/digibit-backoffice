import { convertToParamMap } from '@angular/router';

import {
  DEFAULT_PAGING,
  isPageSize,
  isSortField,
  pageWindow,
  pagingEqual,
  pagingFromParams,
  pagingToQuery,
  pagingToQueryParams,
  totalPages,
} from './product-paging';
import type { ProductPaging } from './product-paging';

describe('product paging (BO-F04)', () => {
  it('tc 5: reads page/size/sort/dir out of the URL', () => {
    const params = convertToParamMap({
      page: '3',
      size: '10',
      sort: 'price',
      dir: 'desc',
    });

    expect(pagingFromParams(params)).toEqual({
      page: 3,
      pageSize: 10,
      sort: 'price',
      dir: 'desc',
    });
  });

  it('tc 5/10: invalid values fall back instead of reaching the API', () => {
    expect(pagingFromParams(convertToParamMap({ page: '0', size: '25' }))).toEqual({
      ...DEFAULT_PAGING,
    });
    expect(pagingFromParams(convertToParamMap({ page: '2.5' })).page).toBe(1);
    expect(pagingFromParams(convertToParamMap({ sort: 'unknown', dir: 'desc' }))).toEqual(
      DEFAULT_PAGING,
    );
    expect(pagingFromParams(convertToParamMap({ sort: 'price' })).dir).toBe('asc');
  });

  it('tc 1/3: maps size to pageSize and omits sort/dir when inactive', () => {
    const paging: ProductPaging = { page: 2, pageSize: 50, sort: 'createdAt', dir: 'desc' };

    expect(pagingToQuery(paging)).toEqual({
      page: 2,
      pageSize: 50,
      sort: 'createdAt',
      dir: 'desc',
    });

    expect(pagingToQuery(DEFAULT_PAGING)).toEqual({
      page: 1,
      pageSize: 20,
      sort: undefined,
      dir: undefined,
    });
  });

  it('tc 5: URL params omit defaults and remove keys with null', () => {
    expect(pagingToQueryParams(DEFAULT_PAGING)).toEqual({
      page: null,
      size: null,
      sort: null,
      dir: null,
    });

    expect(pagingToQueryParams({ page: 2, pageSize: 10, sort: 'price', dir: 'desc' })).toEqual({
      page: '2',
      size: '10',
      sort: 'price',
      dir: 'desc',
    });
  });

  it('compares paging states by value', () => {
    expect(pagingEqual(DEFAULT_PAGING, { ...DEFAULT_PAGING })).toBe(true);
    expect(pagingEqual(DEFAULT_PAGING, { ...DEFAULT_PAGING, page: 2 })).toBe(false);
    expect(pagingEqual(DEFAULT_PAGING, { ...DEFAULT_PAGING, pageSize: 50 })).toBe(false);
    expect(pagingEqual(DEFAULT_PAGING, { ...DEFAULT_PAGING, sort: 'price' })).toBe(false);
    expect(pagingEqual(DEFAULT_PAGING, { ...DEFAULT_PAGING, dir: 'desc' })).toBe(false);
  });

  it('tc 6: totalPages is at least one and rounds up', () => {
    expect(totalPages(0, 20)).toBe(1);
    expect(totalPages(20, 20)).toBe(1);
    expect(totalPages(21, 20)).toBe(2);
    expect(totalPages(137, 20)).toBe(7);
    expect(totalPages(137, 10)).toBe(14);
  });

  it('tc 9: pageWindow shows every page up to seven', () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('tc 6/9: pageWindow keeps first, last and the active page ±1 for long sets', () => {
    expect(pageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(pageWindow(1, 10)).toEqual([1, 2, null, 10]);
    expect(pageWindow(10, 10)).toEqual([1, null, 9, 10]);
  });

  it('clamps a stale current page when building the window', () => {
    expect(pageWindow(99, 10)).toEqual([1, null, 9, 10]);
    expect(pageWindow(0, 10)).toEqual([1, 2, null, 10]);
  });

  it('narrows sort fields and page sizes', () => {
    expect(isSortField('price')).toBe(true);
    expect(isSortField('categoryName')).toBe(false);
    expect(isSortField(null)).toBe(false);

    expect(isPageSize(10)).toBe(true);
    expect(isPageSize(20)).toBe(true);
    expect(isPageSize(50)).toBe(true);
    expect(isPageSize(25)).toBe(false);
  });
});
