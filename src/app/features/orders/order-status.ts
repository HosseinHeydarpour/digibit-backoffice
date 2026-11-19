// src/app/features/orders/order-status.ts
//
// The orders module's single status → label + badge mapping (BO-H01, the seam
// BO-H10 will formalise).
//
// The LABELS come from the shared `ORDER_STATUS_META`, so an order reads
// «در انتظار پرداخت» identically here, in the dashboard widget and (later) on
// the invoice. The badge CLASSES mirror the dashboard's recent-orders table
// pixel for pixel — the same status must not be yellow on one screen and amber
// on the next. They live here, not in `models/`, because they are runtime
// values (the types-only rule).
//
// An unknown status (a malformed API row) falls back to a neutral «نامشخص»
// pill instead of printing the raw English string into a Persian table.

import { ORDER_STATUS_META } from '@shared/models/status-badge.model';
import type { OrderStatus } from '@shared/models/status-badge.model';

/** Persian label for a status; an unknown value reads «نامشخص», never raw English. */
export function orderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_META[status]?.label ?? 'نامشخص';
}

/**
 * The pill classes, dark mode included. The pairs match the Arino reference:
 * green for delivered, brand tint for the moving statuses, blue for paid,
 * red for cancelled/returned, yellow while waiting for payment.
 */
export function orderStatusBadgeClass(status: OrderStatus): string {
  switch (status) {
    case 'delivered':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
    case 'shipped':
    case 'processing':
      return 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light';
    case 'paid':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400';
    case 'cancelled':
    case 'returned':
      return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
    case 'pending':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
  }
}
