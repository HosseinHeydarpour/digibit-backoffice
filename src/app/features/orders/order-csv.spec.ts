import { formatPersianDate } from '@shared/pipes/persian-date.pipe';

import type { OrderListItem } from './models/order.model';
import { buildOrdersCsv } from './order-csv';
import { orderStatusLabel } from './order-status';

const ROW: OrderListItem = {
  id: '1',
  code: 'ORD-1',
  customerId: 'c1',
  customerName: 'زهرا محمدی',
  status: 'shipped',
  total: 12_500_000,
  itemCount: 2,
  createdAt: 1_728_000_000_000,
};

describe('buildOrdersCsv (BO-H08)', () => {
  it('writes a Persian header and labels a status in Persian', () => {
    const csv = buildOrdersCsv([ROW]);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('کد سفارش,مشتری');
    expect(csv).toContain(orderStatusLabel(ROW.status));
  });

  it('formats the date and quotes a name with a comma', () => {
    const csv = buildOrdersCsv([{ ...ROW, customerName: 'نوری, محمد' }]);

    expect(csv).toContain(`"نوری, محمد"`);
    expect(csv).toContain(formatPersianDate(ROW.createdAt));
  });

  it('writes a header-only file for an empty result', () => {
    const csv = buildOrdersCsv([]);
    const lines = csv.replace('\uFEFF', '').split('\r\n');

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('وضعیت');
  });
});
