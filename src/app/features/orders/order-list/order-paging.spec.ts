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
} from './order-paging';
import type { OrderPaging } from './order-paging';

describe('order paging (BO-H01)', () => {
  it('reads page/size/sort/dir out of the URL', () => {
    const params = convertToParamMap({
      page: '2',
      size: '10',
      sort: 'total',
      dir: 'desc',
    });

    expect(pagingFromParams(params)).toEqual({
      page: 2,
      pageSize: 10,
      sort: 'total',
      dir: 'desc',
    });
  });

  it('invalid values fall back instead of reaching the API', () => {
    expect(pagingFromParams(convertToParamMap({ page: '0', size: '25' }))).toEqual({
      ...DEFAULT_PAGING,
    });
    expect(pagingFromParams(convertToParamMap({ page: '2.5' })).page).toBe(1);
    // `name` is a PRODUCTS sort field; orders only allow createdAt/total.
    expect(pagingFromParams(convertToParamMap({ sort: 'name', dir: 'desc' }))).toEqual(
      DEFAULT_PAGING,
    );
    expect(pagingFromParams(convertToParamMap({ sort: 'total' })).dir).toBe('asc');
  });

  it('maps size to pageSize and omits sort/dir when inactive', () => {
    const paging: OrderPaging = { page: 2, pageSize: 50, sort: 'createdAt', dir: 'desc' };

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

  it('URL params omit defaults and remove keys with null', () => {
    expect(pagingToQueryParams(DEFAULT_PAGING)).toEqual({
      page: null,
      size: null,
      sort: null,
      dir: null,
    });

    expect(pagingToQueryParams({ page: 2, pageSize: 10, sort: 'total', dir: 'desc' })).toEqual({
      page: '2',
      size: '10',
      sort: 'total',
      dir: 'desc',
    });
  });

  it('compares paging states by value', () => {
    expect(pagingEqual(DEFAULT_PAGING, { ...DEFAULT_PAGING })).toBe(true);
    expect(pagingEqual(DEFAULT_PAGING, { ...DEFAULT_PAGING, page: 2 })).toBe(false);
    expect(pagingEqual(DEFAULT_PAGING, { ...DEFAULT_PAGING, pageSize: 50 })).toBe(false);
    expect(pagingEqual(DEFAULT_PAGING, { ...DEFAULT_PAGING, sort: 'total' })).toBe(false);
    expect(pagingEqual(DEFAULT_PAGING, { ...DEFAULT_PAGING, dir: 'desc' })).toBe(false);
  });

  it('totalPages is at least one and rounds up', () => {
    expect(totalPages(0, 20)).toBe(1);
    expect(totalPages(20, 20)).toBe(1);
    expect(totalPages(28, 20)).toBe(2);
    expect(totalPages(28, 10)).toBe(3);
  });

  it('pageWindow shows every page up to seven', () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('pageWindow keeps first, last and the active page ±1 for long sets', () => {
    expect(pageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(pageWindow(1, 10)).toEqual([1, 2, null, 10]);
    expect(pageWindow(10, 10)).toEqual([1, null, 9, 10]);
  });

  it('clamps a stale current page when building the window', () => {
    expect(pageWindow(99, 10)).toEqual([1, null, 9, 10]);
    expect(pageWindow(0, 10)).toEqual([1, 2, null, 10]);
  });

  it('narrows sort fields and page sizes', () => {
    expect(isSortField('createdAt')).toBe(true);
    expect(isSortField('total')).toBe(true);
    expect(isSortField('customerName')).toBe(false);
    expect(isSortField(null)).toBe(false);

    expect(isPageSize(10)).toBe(true);
    expect(isPageSize(20)).toBe(true);
    expect(isPageSize(50)).toBe(true);
    expect(isPageSize(25)).toBe(false);
  });
});
