import { convertToParamMap } from '@angular/router';

import {
  EMPTY_FILTERS,
  dateRangeInvalid,
  filtersEqual,
  filtersFromParams,
  filtersToQuery,
  filtersToQueryParams,
} from './order-filters';

describe('order filters (BO-H02)', () => {
  it('reads every key from the URL and trims the text', () => {
    const filters = filtersFromParams(
      convertToParamMap({
        query: ' ۱۴۰۲۳ ',
        status: 'shipped',
        from: '2026-11-01',
        to: '2026-11-10',
      }),
    );

    expect(filters).toEqual({
      query: '۱۴۰۲۳',
      status: 'shipped',
      from: '2026-11-01',
      to: '2026-11-10',
    });
  });

  it('falls back on an unknown status and a malformed date', () => {
    const filters = filtersFromParams(
      convertToParamMap({ status: 'lost', from: '2026/11/01', to: 'yesterday' }),
    );

    expect(filters).toEqual(EMPTY_FILTERS);
  });

  it('converts an inclusive Jalali day range to UTC millis', () => {
    const query = filtersToQuery({
      query: '',
      status: 'shipped',
      from: '2026-11-01',
      to: '2026-11-10',
    });

    expect(query.status).toBe('shipped');
    expect(query.from).toBe(new Date('2026-11-01T00:00:00').getTime());
    expect(query.to).toBe(new Date('2026-11-10T23:59:59.999').getTime());
  });

  it('drops both bounds when the range is inverted (tc 10)', () => {
    const filters = { ...EMPTY_FILTERS, from: '2026-11-10', to: '2026-11-01' };

    expect(dateRangeInvalid(filters)).toBe(true);
    expect(filtersToQuery(filters).from).toBeUndefined();
    expect(filtersToQuery(filters).to).toBeUndefined();
  });

  it('omits empty filters from the URL and compares by value', () => {
    expect(filtersToQueryParams(EMPTY_FILTERS)).toEqual({});
    expect(filtersToQueryParams({ ...EMPTY_FILTERS, status: 'paid' })).toEqual({ status: 'paid' });
    expect(filtersEqual(EMPTY_FILTERS, { ...EMPTY_FILTERS })).toBe(true);
    expect(filtersEqual(EMPTY_FILTERS, { ...EMPTY_FILTERS, query: 'x' })).toBe(false);
  });
});
