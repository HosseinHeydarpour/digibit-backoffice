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
  /** Sales total, in Toman. */
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
