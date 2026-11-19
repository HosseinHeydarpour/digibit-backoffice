import { convertToParamMap } from '@angular/router';

import {
  DEFAULT_CUSTOMER_STATE,
  hasActiveFilters,
  pageWindow,
  stateEqual,
  stateFromParams,
  stateToParams,
  stateToQuery,
  totalPages,
} from './customer-paging';

function params(record: Record<string, string>) {
  return convertToParamMap(record);
}

describe('customer paging state (BO-I01)', () => {
  it('reads a full URL into the state', () => {
    const state = stateFromParams(
      params({
        query: ' مریم ',
        status: 'blocked',
        page: '2',
        size: '10',
        sort: 'createdAt',
        dir: 'desc',
      }),
    );

    expect(state).toEqual({
      query: 'مریم',
      status: 'blocked',
      page: 2,
      pageSize: 10,
      sort: 'createdAt',
      dir: 'desc',
    });
  });

  it('falls back on every invalid value instead of sending it to the API', () => {
    const state = stateFromParams(
      params({ status: 'deleted', page: '0', size: '25', sort: 'total', dir: 'desc' }),
    );

    expect(state).toEqual(DEFAULT_CUSTOMER_STATE);
  });

  it('maps the state to the service query, dropping the «همه» status', () => {
    expect(stateToQuery({ ...DEFAULT_CUSTOMER_STATE, page: 2, pageSize: 10 })).toEqual({
      query: undefined,
      status: undefined,
      page: 2,
      pageSize: 10,
      sort: undefined,
      dir: undefined,
    });
  });

  it('writes only non-default keys to the URL', () => {
    expect(stateToParams(DEFAULT_CUSTOMER_STATE)).toEqual({
      query: null,
      status: null,
      page: null,
      size: null,
      sort: null,
      dir: null,
    });

    expect(
      stateToParams({
        ...DEFAULT_CUSTOMER_STATE,
        query: 'علی',
        status: 'active',
        page: 2,
        sort: 'createdAt',
        dir: 'desc',
      }),
    ).toEqual({
      query: 'علی',
      status: 'active',
      page: '2',
      size: null,
      sort: 'createdAt',
      dir: 'desc',
    });
  });

  it('compares two states as requests', () => {
    expect(stateEqual(DEFAULT_CUSTOMER_STATE, { ...DEFAULT_CUSTOMER_STATE })).toBe(true);
    expect(stateEqual(DEFAULT_CUSTOMER_STATE, { ...DEFAULT_CUSTOMER_STATE, page: 2 })).toBe(false);
  });

  it('knows when a filter narrows the list', () => {
    expect(hasActiveFilters(DEFAULT_CUSTOMER_STATE)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_CUSTOMER_STATE, query: 'a' })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_CUSTOMER_STATE, status: 'blocked' })).toBe(true);
  });

  it('never reports zero pages', () => {
    expect(totalPages(0, 20)).toBe(1);
    expect(totalPages(187, 20)).toBe(10);
    expect(totalPages(21, 10)).toBe(3);
  });

  it('compacts a long paginator around the active page', () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(pageWindow(1, 10)).toEqual([1, 2, null, 10]);
    expect(pageWindow(99, 10)).toEqual([1, null, 9, 10]);
  });
});
