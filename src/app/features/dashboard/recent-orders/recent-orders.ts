import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ORDER_STATUS_META } from '@shared/models/status-badge.model';
import type { OrderStatus } from '@shared/models/status-badge.model';
import { PersianDatePipe } from '@shared/pipes/persian-date.pipe';
import { PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { TomanPipe } from '@shared/pipes/toman.pipe';

import type { DashboardRecentOrder, OrderColumn } from '../models/dashboard.model';

/**
 * The table's columns, in render order — the one place their names and their
 * responsive classes live (BO-E04's «ستون‌ها را در آرایهٔ cols تعریف کن»).
 *
 * WHY THIS ARRAY IS NOT IN `models/dashboard.model.ts`
 * ---------------------------------------------------
 * It used to be, and that cost a test suite. `models/dashboard.model.ts` is a
 * runtime module only because of this constant: every other export is a type,
 * which the compiler erases. With the constant in it, the model was reachable
 * from BOTH the lazy `dashboard-routes` chunk and the eager test bundle, so the
 * bundler hoisted it into a shared async chunk — and `RecentOrders`, built from
 * the eager side, read `RECENT_ORDER_COLS` before that chunk had initialised.
 * The value was `undefined`, `@for` over `undefined` renders nothing, and the
 * table came out with an empty `<thead>` (BO-E04 tc 6) *only* when the whole
 * suite ran together.
 *
 * Keeping it here makes the model type-only, which is what a model file should
 * be, and puts the columns next to the template that reads them.
 */
const COLUMNS: readonly OrderColumn[] = [
  { field: 'code', header: 'شماره سفارش' },
  { field: 'createdAt', header: 'تاریخ', class: 'hidden sm:table-cell' },
  { field: 'customerName', header: 'مشتری' },
  { field: 'total', header: 'مبلغ' },
  { field: 'status', header: 'وضعیت' },
  { field: 'actions', header: 'عملیات' },
];

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
 *    - Iterates `cols` (`COLUMNS`, defined above).
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

  readonly cols: readonly OrderColumn[] = COLUMNS;

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
