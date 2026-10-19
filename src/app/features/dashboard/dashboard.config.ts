// src/app/features/dashboard/dashboard.config.ts
//
// Runtime values the dashboard's widgets share. Deliberately NOT in
// `models/dashboard.model.ts`: a model file is types only, and a runtime export
// from it turns the model into a module the bundler can hoist into a shared
// async chunk — see the note on `COLUMNS` in `recent-orders.ts` for the test
// failure that caused.

/**
 * The stock threshold for «کالاهای کم‌موجودی» (BO-E05 tc 2).
 *
 * One number, exported once, because three places have to agree on it:
 *
 *   1. the request      — `DashboardService.lowStock()` sends `?threshold=5`
 *   2. the card's filter — `LowStock.threshold`'s input default
 *   3. the mock fixture  — `MOCK_LOW_STOCK_THRESHOLD` in `core/mock/fixtures`
 *                          (a local copy: `core/` must never import `features/`)
 *
 * They used to be three literals — 5, 5, and 6 — which is how a stock-6 product
 * ended up fetched and then silently hidden by the card.
 *
 * A real store makes this per-product, or a settings value; when BO-H exposes
 * one, this constant becomes its fallback and nothing else changes.
 */
export const LOW_STOCK_THRESHOLD = 5;
