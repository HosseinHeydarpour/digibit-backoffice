/** Statuses shared across features — used by orders, tickets and comments. */
export type OrderStatus =
  'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

export type TicketStatus = 'open' | 'pending' | 'closed';
export type CommentStatus = 'pending' | 'approved' | 'rejected';

/** PrimeNG severity values, so a badge colour never gets invented inline. */
export type BadgeSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

/**
 * The Persian label + colour for each status. BU-H10 and BO-N02 both need this;
 * keeping one map guarantees an order shown as «در حال ارسال» in the list is
 * worded identically in the detail page.
 */
export const ORDER_STATUS_META: Record<OrderStatus, { label: string; severity: BadgeSeverity }> = {
  pending: { label: 'در انتظار پرداخت', severity: 'warn' },
  paid: { label: 'پرداخت شده', severity: 'info' },
  processing: { label: 'در حال پردازش', severity: 'info' },
  shipped: { label: 'ارسال شده', severity: 'success' },
  delivered: { label: 'تحویل شده', severity: 'success' },
  cancelled: { label: 'لغو شده', severity: 'danger' },
  returned: { label: 'مرجوع شده', severity: 'danger' },
};

/**
 * The server's status names for the same seven states.
 *
 * The API speaks PascalCase (`PendingPayment`); the panel's union is lowercase.
 * One table, so the list, the detail, the dashboard widget and any future
 * screen cannot translate a status differently.
 */
export const ORDER_STATUS_API: Readonly<Record<OrderStatus, string>> = {
  pending: 'PendingPayment',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
};

const ORDER_STATUS_BY_API: Readonly<Record<string, OrderStatus>> = Object.fromEntries(
  Object.entries(ORDER_STATUS_API).map(([panel, api]) => [api, panel as OrderStatus]),
);

/** Turns a server status into the panel's lowercase union, with a safe default. */
export function orderStatusFromApi(value: string): OrderStatus {
  // Already normalised (a fixture, a test, a caller that mapped it once).
  if (value in ORDER_STATUS_API) {
    return value as OrderStatus;
  }

  return ORDER_STATUS_BY_API[value] ?? 'pending';
}

export const TICKET_STATUS_META: Record<TicketStatus, { label: string; severity: BadgeSeverity }> =
  {
    open: { label: 'باز', severity: 'info' },
    pending: { label: 'در انتظار پاسخ', severity: 'warn' },
    closed: { label: 'بسته', severity: 'secondary' },
  };

export const COMMENT_STATUS_META: Record<
  CommentStatus,
  { label: string; severity: BadgeSeverity }
> = {
  pending: { label: 'در انتظار تأیید', severity: 'warn' },
  approved: { label: 'تأییدشده', severity: 'success' },
  rejected: { label: 'ردشده', severity: 'danger' },
};
