import { formatPersianDate } from '@shared/pipes/persian-date.pipe';

import type { OrderListItem } from './models/order.model';
import { orderStatusLabel } from './order-status';

/** Excel needs the BOM or Persian headers open as mojibake. */
const BOM = '\uFEFF';

function cell(value: string | number): string {
  const text = String(value);

  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * Build the CSV for the filtered rows (BO-H08).
 *
 * Pure and separate from the download so the spec can assert the exact text:
 * header row in Persian, human labels instead of status codes, a Persian date,
 * and a BOM so Excel opens the file correctly.
 */
export function buildOrdersCsv(rows: readonly OrderListItem[]): string {
  const header = ['کد سفارش', 'مشتری', 'تعداد اقلام', 'مبلغ کل (تومان)', 'وضعیت', 'تاریخ ثبت'];

  const lines = rows.map((row) =>
    [
      cell(row.code),
      cell(row.customerName),
      cell(row.itemCount),
      cell(row.total),
      cell(orderStatusLabel(row.status)),
      cell(formatPersianDate(row.createdAt)),
    ].join(','),
  );

  return BOM + [header.join(','), ...lines].join('\r\n');
}

/** Trigger a client-side download; the DOM part is deliberately tiny. */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
