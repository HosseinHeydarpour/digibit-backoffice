// src/app/features/orders/models/order.model.ts
//
// The orders module's schema (BO-H01, extended by BO-H09).
//
// TYPES ONLY. A runtime value in `models/` can read back `undefined` when the
// module is reachable from both the eager test bundle and the lazy
// `orders-routes` chunk (the `RECENT_ORDER_COLS` hazard in AGENTS.md). Columns,
// badge classes and the status flow live next to the code that reads them.
//
// `OrderStatus` is NOT redeclared here: the shared union in
// `@shared/models/status-badge.model.ts` already names the seven statuses, and
// the dashboard's recent-orders widget reads the same one. Two unions would let
// a status exist in one screen and not the other.

import type { EntityId, SortOrder } from '@shared/models';
import type { OrderStatus } from '@shared/models/status-badge.model';

/**
 * One row of `GET /orders` — exactly what the list table renders.
 *
 * Deliberately NOT the full `Order`: the address, the items and the history
 * belong to the detail page, and dragging them into every list row would make
 * the table download the whole shop's order history to show six columns.
 */
export interface OrderListItem {
  readonly id: EntityId;
  /** Human-facing code, e.g. `ORD-14023`. The id stays the API's own string. */
  readonly code: string;
  readonly customerId: EntityId;
  readonly customerName: string;
  readonly status: OrderStatus;
  /** Grand total in Toman: subtotal − discount + shipping. */
  readonly total: number;
  /** Total units across the order's lines (sum of item quantities). */
  readonly itemCount: number;
  /** UTC milliseconds (ARCHITECTURE.md §5). */
  readonly createdAt: number;
}

/** The closed set of columns the list may sort by (BO-H01 paginator). */
export type OrderSortField = 'createdAt' | 'total';

/**
 * The list query, as the service accepts it.
 *
 * `from`/`to` are UTC milliseconds and already part of the contract so BO-H02's
 * Jalali range picker only has to convert and call — the wire shape does not
 * change when the filter bar lands.
 */
export interface OrderQuery {
  /** Free text: order code or customer name. */
  readonly query?: string;
  readonly status?: OrderStatus;
  readonly from?: number;
  readonly to?: number;
  readonly page?: number;
  readonly pageSize?: number;
  readonly sort?: OrderSortField;
  readonly dir?: SortOrder;
}

/** One purchased line. Prices are Toman; `totalPrice` is unitPrice × quantity. */
export interface OrderItem {
  readonly id: EntityId;
  readonly productId: EntityId;
  readonly productName: string;
  /** Catalogue photo (data URL in the mock, CDN URL in production), or null. */
  readonly productImage: string | null;
  /** The chosen variant's label, e.g. «64 گیگ», or null for a simple product. */
  readonly variantName: string | null;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly totalPrice: number;
}

/** One recorded transition. `note` carries the cancellation reason when set. */
export interface OrderStatusHistoryEntry {
  readonly id: EntityId;
  readonly status: OrderStatus;
  readonly note: string | null;
  readonly createdAt: number;
}

/** The shipping address as captured at checkout. */
export interface OrderAddress {
  readonly fullName: string;
  readonly phone: string;
  readonly province: string;
  readonly city: string;
  readonly postalCode: string;
  readonly address: string;
}

/**
 * Payment snapshot. A pending order has no gateway/tracking yet — `null`, not
 * an empty string, so «پرداخت نشده» is a state and not a missing value.
 */
export interface OrderPayment {
  readonly method: string;
  readonly gateway: string | null;
  readonly trackingCode: string | null;
  readonly paidAt: number | null;
}

/**
 * The full record `GET /orders/:id` answers — the detail page binds every card
 * from this one response.
 *
 * The money fields obey one rule: `total = subtotal − discount + shippingCost`,
 * and `subtotal` is the sum of the items' `totalPrice`. The mock derives them;
 * the real API must too, or the totals card would print a number the items
 * table contradicts.
 */
export interface Order extends OrderListItem {
  readonly items: readonly OrderItem[];
  readonly subtotal: number;
  readonly discount: number;
  readonly shippingCost: number;
  readonly shippingMethod: string;
  readonly address: OrderAddress;
  readonly payment: OrderPayment;
  readonly statusHistory: readonly OrderStatusHistoryEntry[];
}

/**
 * One column of the list table. `sortable` is consumed by the header button,
 * `class` carries the responsive hiding (BO-H01 tc 9). Lives here as a TYPE;
 * the COLUMNS array itself lives in `order-list.ts`.
 */
export interface OrderColumn {
  readonly field:
    'code' | 'customerName' | 'itemCount' | 'total' | 'status' | 'createdAt' | 'actions';
  readonly header: string;
  readonly class?: string;
  readonly sortable?: boolean;
}
