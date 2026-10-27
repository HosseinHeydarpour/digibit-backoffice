// src/app/features/products/product-stock.ts
//
// The low-stock rule, in one place (BO-F12).
//
// WHY A FUNCTION AND NOT `stock <= threshold` IN EACH TEMPLATE
// ------------------------------------------------------------
// Two surfaces ask the same question: the products table (one badge per row) and
// the create form's inventory tab (the live total). Written twice, the two drift
// the day one of them treats zero as "low" and the other as "out" — and the
// disagreement is invisible until a customer reads a green «موجود» over a zero.
//
// `out` and `low` are deliberately different states, not two shades of warning:
// zero means the shelf is empty and the badge says «ناموجود»; `0 < stock <=
// threshold` means the shelf is running out and says «کم‌موجودی». A shop with a
// threshold of 0 therefore warns about nothing until it is actually out, which is
// what a threshold of 0 should mean.
//
// NEGATIVE STOCK READS AS OUT
// ---------------------------
// The form validates non-negative values, so a negative can only arrive from a
// corrupted row or a server bug. Reporting it as «ناموجود» is the safe claim: it
// never advertises stock that does not exist.

export type StockLevel = 'out' | 'low' | 'ok';

export interface StockLevelMeta {
  readonly label: string;
  /** The pill's tint. Tints survive printing (`print-color-adjust` in tailwind.css). */
  readonly badgeClass: string;
}

/**
 * Label and tint per level, in one table.
 *
 * The products table and the create form both read it, so «کم‌موجودی» cannot mean
 * amber in one place and orange in the other. Colours follow the dashboard's
 * low-stock card, which is the same warning in a different surface.
 */
export const STOCK_LEVEL_META: Readonly<Record<StockLevel, StockLevelMeta>> = {
  out: {
    label: 'ناموجود',
    badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  low: {
    label: 'کم‌موجودی',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
  ok: {
    label: 'موجود',
    badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
};

/**
 * One row's stock level.
 *
 * TRACE — «کارتریج تونر» with `stock: 4` and `lowStockThreshold: 5`:
 *
 *   1. `Number.isFinite(4)` → true, `4 <= 0` → false, so it is not `out`.
 *   2. `4 <= 5` → true → `low`.
 *   3. The table calls `stockMeta(item)`, which spreads `STOCK_LEVEL_META.low`:
 *      «کم‌موجودی» on an amber pill, next to the number ۴.
 *   4. Raising the threshold to 10 keeps `low`; lowering it to 3 makes the next
 *      call return `ok` and the pill disappears. The number itself never changes.
 *
 * The same input through the form: `stockLevel(inventory.total, inventory.threshold)`.
 */
export function stockLevel(stock: number, lowStockThreshold: number): StockLevel {
  if (!Number.isFinite(stock) || stock <= 0) {
    return 'out';
  }

  return stock <= lowStockThreshold ? 'low' : 'ok';
}
