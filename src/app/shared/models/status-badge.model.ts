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
  paid: { label: 'پرداختشده', severity: 'info' },
  processing: { label: 'در حال پردازش', severity: 'info' },
  shipped: { label: 'ارسالشده', severity: 'success' },
  delivered: { label: 'تحویلشده', severity: 'success' },
  cancelled: { label: 'لغوشده', severity: 'danger' },
  returned: { label: 'مرجوعشده', severity: 'danger' },
};

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
