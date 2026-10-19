// src/app/features/dashboard/models/dashboard.model.ts
//
// The dashboard's own models, in the dashboard's own folder.
//
// WHY NOT `shared/models`
// -----------------------
// A shared model is one TWO features agree on (BO-C06): `ApiResponse`, `Page`,
// `SessionUser`, `ApiError`. Nothing else in the panel will ever need a
// dashboard summary — the products page wants a product row, not a KPI tile.
// Putting this in the shared barrel would make one page's schema everybody's
// problem, and the barrel would grow with every feature until it is the whole
// backend. `ARCHITECTURE.md §3` puts a feature's models in `features/*/models/`
// for exactly this reason.
//
// WHY EVERY FIELD IS READONLY
// ---------------------------
// The resolver's job is to hand the page a value, not to let the page edit the
// server's answer. `readonly` makes "the page recomputes the summary locally"
// a compile error instead of a tile that quietly disagrees with the next
// re-resolve.

import type { OrderStatus } from '@shared/models/status-badge.model';

/**
 * The one payload `GET /dashboard/summary` returns (BO-E01).
 *
 * All counts are integers and all money is **Toman** — the unit the `toman`
 * pipe formats and the unit `ARCHITECTURE.md §8` stores. Converting here would
 * make the panel and the API disagree about what a number means.
 *
 * There is no `id` and no timestamps on purpose: this is an aggregate, not an
 * entity, so nothing in it can be edited or deleted.
 */
export interface DashboardSummary {
  /**
   * TODAY's sales, in Toman — the number the «فروش امروز» tile prints.
   *
   * Not a period total, and not "all sales ever": the tile says «امروز», so
   * this field has to mean the same day the sales chart ends on. The API and
   * the mock fixtures both derive it from the last chart point for exactly
   * that reason — see `core/mock/fixtures/index.ts`, where a hardcoded value
   * used to disagree with the chart and the page showed two sales figures
   * (1,284,500,000 in the tile, 84,000,000 in the last bar).
   */
  readonly totalSales: number;

  /** Orders awaiting action — the reference dashboard's «سفارش‌های جدید». */
  readonly pendingOrders: number;

  /** Registered customers. */
  readonly customerCount: number;

  /** Products in the catalogue. */
  readonly productCount: number;

  /**
   * Orders in the period, in any status.
   *
   * Distinct from `pendingOrders`, which is the actionable subset. The tile
   * prints the pending count and says «از ۳۴۲ سفارش ثبت‌شده» underneath it, so
   * the pair reads as "23 of 342" rather than repeating one number twice.
   */
  readonly orderCount: number;

  /**
   * Percentage change versus the previous period, e.g. `12.4`.
   *
   * Signed: negative means the number went down. Left as a number rather than
   * a direction so `toKpiTrend` (BO-E02) can decide the sign, the colour, the
   * arrow and the sentence in one place, instead of this model guessing at
   * presentation.
   */
  readonly salesChangePercent: number;

  /** Products at or below the low-stock threshold. */
  readonly lowStockCount: number;

  /** Comments awaiting moderation. */
  readonly newComments: number;
}

export type SalesChartRange = 7 | 30;

/**
 * One x-axis slot of the sales chart — one day, two bars.
 *
 * WHY TWO NUMBERS AND NOT ONE
 * ---------------------------
 * The chart draws a GROUP per day: revenue beside order count, exactly like the
 * design reference's «آمار فروش ماهانه». They answer different questions — a
 * day can earn more while selling fewer, more expensive things — and the panel
 * exists to make that visible. One number per day hid it.
 *
 * TRACE: `{ date: '2026-10-18', value: 35_000_000, orders: 19 }` renders one
 * x label («۲۶ مهر»), a green bar at 35M on the RIGHT axis and a blue bar at 19
 * on the LEFT axis. Hovering either bar prints its own unit — «درآمد: … تومان»
 * or «سفارشات: ۱۹» — because the two axes measure different things.
 */
export interface SalesChartPoint {
  /** The day, `YYYY-MM-DD`. The chart turns it into a Jalali label. */
  readonly date: string;

  /**
   * Revenue for that day, in **Toman** — the same unit `totalSales` uses.
   *
   * Kept in Toman rather than pre-divided into millions so the tooltip can print
   * an exact amount; only the AXIS divides, and only for its tick labels.
   */
  readonly value: number;

  /**
   * Orders placed that day — the second bar of the group.
   *
   * Counts, not money: it has its own y-axis, because a range of 15-25 orders
   * and a range of 14-35 million Toman cannot share one scale without one of
   * them flattening into the floor.
   */
  readonly orders: number;
}

export interface DashboardRecentOrder {
  readonly id: string;
  readonly code: string;
  readonly customerId: string;
  readonly customerName?: string;
  readonly status: OrderStatus;
  readonly total: number;
  readonly itemCount: number;
  readonly createdAt: string | number;
}
export interface OrderColumn {
  readonly field: string;
  readonly header: string;
  readonly class?: string;
}

/**
 * One row of `GET /dashboard/low-stock` (BO-E05).
 *
 * Deliberately NOT the full product: the widget shows a name, a thumbnail, a
 * price and a stock badge, so that is all it gets. A product row (variants,
 * gallery, SEO fields) belongs to BO-F01 and would drag the products schema
 * into the dashboard's chunk.
 */
export interface DashboardLowStockItem {
  readonly id: string;
  readonly name: string;

  /** Units left. `0` means out of stock; anything `<= threshold` is listed. */
  readonly stock: number;

  /** Unit price in Toman, printed under the name by the `toman` pipe. */
  readonly price: number;

  /** Absolute URL, or `null` — the widget falls back to a box glyph. */
  readonly imageUrl?: string | null;
}
