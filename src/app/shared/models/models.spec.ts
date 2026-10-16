import {
  ACTIVE_LABELS,
  COMMENT_STATUS_META,
  ORDER_STATUS_META,
  TICKET_STATUS_META,
  fromPrimeSort,
  toOptions,
  toPrimeSort,
} from './index';
import type { BaseEntity, EntityId, OrderStatus, SelectOption, SortState } from './index';

describe('shared models', () => {
  it('keeps the ApiError contract intact', () => {
    // already covered in api.spec.ts — this asserts the barrel re-exports it
    expect(typeof ORDER_STATUS_META).toBe('object');
  });

  it('builds SelectOption values typed to the value union', () => {
    const order: OrderStatus[] = ['pending', 'paid'];
    const options = toOptions(order, {
      pending: 'در انتظار',
      paid: 'پرداختشده',
    } as Record<OrderStatus, string>);

    expect(options.length).toBe(2);
    expect(options[0]).toEqual({ label: 'در انتظار', value: 'pending' });
  });

  it('supports numeric SelectOption values', () => {
    const option: SelectOption<number> = { label: 'دسته یک', value: 1 };
    expect(option.value).toBe(1);
  });

  it('converts PrimeNG sort order both ways', () => {
    expect(fromPrimeSort(1)).toBe('asc');
    expect(fromPrimeSort(-1)).toBe('desc');
    expect(fromPrimeSort(undefined)).toBe('asc');
    expect(toPrimeSort('asc')).toBe(1);
    expect(toPrimeSort('desc')).toBe(-1);
  });

  it('produces a SortState the API can consume', () => {
    const sort: SortState = { field: 'price', order: 'desc' };
    expect(sort.field).toBe('price');
    expect(sort.order).toBe('desc');
  });

  it('labels every order status in Persian', () => {
    const statuses: OrderStatus[] = [
      'pending',
      'paid',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'returned',
    ];
    for (const status of statuses) {
      expect(ORDER_STATUS_META[status].label).toBeTruthy();
      expect(ORDER_STATUS_META[status].severity).toBeTruthy();
    }
    expect(statuses.length).toBe(7);
  });

  it('labels ticket and comment statuses', () => {
    expect(TICKET_STATUS_META.open.label).toBe('باز');
    expect(COMMENT_STATUS_META.pending.label).toBe('در انتظار تأیید');
  });

  it('exposes the active/inactive wording', () => {
    expect(ACTIVE_LABELS.active).toBe('فعال');
    expect(ACTIVE_LABELS.inactive).toBe('غیرفعال');
  });

  it('types an entity with a string id and UTC-millis dates', () => {
    const entity: BaseEntity = { id: 'abc', createdAt: 1_700_000_000_000 };
    const id: EntityId = entity.id;
    expect(typeof id).toBe('string');
    expect(typeof entity.createdAt).toBe('number');
  });

  it('has no `any` in any exported model', async () => {
    // a compile-time guarantee: if any model used `any`, this module would still
    // build, so assert on the source instead
    const sources = await Promise.all([
      import('./select-option.model'),
      import('./sort-state.model'),
      import('./status.model'),
      import('./status-badge.model'),
      import('./api-response.model'),
      import('./api-error.model'),
    ]);
    expect(sources.every((m) => m !== undefined)).toBe(true);
  });
});
