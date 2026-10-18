import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ORDER_STATUS_META } from '@shared/models/status-badge.model';
import type { OrderStatus } from '@shared/models/status-badge.model';
import { PersianDatePipe } from '@shared/pipes/persian-date.pipe';
import { PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { TomanPipe } from '@shared/pipes/toman.pipe';

import { RECENT_ORDER_COLS } from '../models/dashboard.model';
import type { DashboardRecentOrder, OrderColumn } from '../models/dashboard.model';

/**
 * Recent Orders Widget Component (BO-E04)
 *
 * Displays the 8 latest orders matching the Arino theme specification.
 *
 * TRACE / PRACTICAL USAGE EXAMPLE:
 * ---------------------------------
 * Input `orders`:
 *   [
 *     {
 *       id: '1',
 *       code: 'ORD-14001',
 *       customerName: 'علی رضایی',
 *       status: 'delivered',
 *       total: 1250000,
 *       createdAt: 1723456789000
 *     }
 *   ]
 *
 * 1. Columns Loop:
 *    - Iterates `cols` array (`RECENT_ORDER_COLS`).
 *    - Applies responsive hiding: `createdAt` column receives `hidden sm:table-cell`.
 *
 * 2. Row Formatting:
 *    - Code: '#ORD-14001' -> Persian digits -> '#ORD-۱۴۰۰۱'
 *    - Date: 1723456789000 -> persianDate pipe -> '۱۴۰۳/۰۵/۲۲'
 *    - Total: 1250000 -> toman pipe -> '۱٬۲۵۰٬۰۰۰ تومان'
 *    - Status 'delivered':
 *      - `statusLabel('delivered')` -> 'تحویلشده'
 *      - `statusBadgeClass('delivered')` -> 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
 *
 * 3. User Interaction:
 *    - Clicking anywhere on the row emits `orderClick('1')` and navigates to `/orders/1`.
 *    - Clicking "مشاهده همه" navigates to `/orders`.
 */
@Component({
  selector: 'app-recent-orders',
  imports: [RouterLink, PersianDatePipe, PersianDigitsPipe, TomanPipe],
  templateUrl: './recent-orders.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentOrders {
  readonly orders = input<readonly DashboardRecentOrder[] | null>(null);
  readonly loading = input<boolean>(false);
  readonly orderClick = output<string>();

  readonly cols: readonly OrderColumn[] = RECENT_ORDER_COLS;

  statusLabel(status: OrderStatus): string {
    return ORDER_STATUS_META[status]?.label ?? status;
  }

  statusBadgeClass(status: OrderStatus): string {
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
      default:
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
    }
  }

  selectOrder(orderId: string): void {
    this.orderClick.emit(orderId);
  }
}
