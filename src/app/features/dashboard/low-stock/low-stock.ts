// src/app/features/dashboard/low-stock/low-stock.ts
//
// BO-E05 — the «کالاهای کم‌موجودی» card that sits beside the sales chart.
//
// WHAT THIS COMPONENT OWNS, AND WHAT IT DOES NOT
// ----------------------------------------------
// It owns ONE piece of logic — "which rows are worth showing" — and it owns it
// as a `computed`, not as a `*ngIf` chain in the template, because the same
// answer drives three places at once: the count badge, the empty state and the
// list itself. Three template expressions would be three chances to disagree.
//
// It does NOT fetch (the page does — see `Dashboard.lowStockItems`), it does
// NOT format numbers (`persianDigits` / `toman` do), and it does NOT navigate
// on its own (it emits `editClick` and the page routes). The one exception is
// «مشاهده همه», a static link to the products list — a widget that knows where
// its own list lives is fine; a widget that knows how to open one product's
// editor is not.
//
// TRACE / PRACTICAL USAGE EXAMPLE
// -------------------------------
// Input `items` (what `GET /dashboard/low-stock` returns):
//   [
//     { id: 'p1', name: 'کیبورد مکانیکی', stock: 0,  price: 1_850_000, imageUrl: null },
//     { id: 'p2', name: 'ماوس گیمینگ',    stock: 3,  price: 920_000,   imageUrl: null },
//     { id: 'p3', name: 'ساعت هوشمند',    stock: 12, price: 3_400_000, imageUrl: '/p3.jpg' },
//   ]
// Input `threshold`: 5   (default = LOW_STOCK_THRESHOLD)
// Input `loading`:   false
//
// 1. `filteredItems()` runs — copy, filter, sort:
//    - p3 is dropped: 12 > 5. The API already filters, but the widget filters
//      again so a wrong/absent query param can never print a healthy product
//      in a "running out" card.
//    - The surviving two are sorted by stock ASC, so the empty shelf is first:
//      [p1 (0), p2 (3)]. `[...list]` is what makes `sort` legal — the input
//      array is `readonly` and must not be reordered in place.
//
// 2. The header badge prints `filteredItems().length` through `persianDigits`:
//    2 -> «۲». It is hidden while the skeleton is up, because «۰» during a
//    load reads as "nothing is low", which is a different statement.
//
// 3. Each row's badge asks `isOutOfStock(stock)`:
//    - p1 (0)  -> true  -> label «ناموجود»,  class `bg-red-100 …`   (tc 3)
//    - p2 (3)  -> false -> label «۳ عدد»,    class `bg-yellow-100 …` (tc 3)
//    The label and the class come from the same predicate, so a red badge can
//    never say «۳ عدد».
//
// 4. Clicking the pencil calls `onEdit('p1')`, which emits `editClick('p1')`.
//    The page's handler runs `router.navigate(['/products', 'p1'])`. The
//    template has NO `routerLink` on that button on purpose: a link plus an
//    emitted navigate is two navigations for one click (the second arrives as
//    `NavigationSkipped`), and it double-counts the moment anyone adds
//    analytics to the click.
//
// 5. `items` is `null` until the first response lands. `showSkeleton()` treats
//    `null` as "loading", so the card never flashes «موجودی انبار در وضعیت
//    سالم است» at a user whose request has not come back yet — a false
//    all-clear is worse than a placeholder.

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ErrorState } from '@shared/components/error-state/error-state';
import { PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { TomanPipe } from '@shared/pipes/toman.pipe';

import { LOW_STOCK_THRESHOLD } from '../dashboard.config';
import type { DashboardLowStockItem } from '../models/dashboard.model';
import type { WidgetState } from '../models/widget-state';

@Component({
  selector: 'app-low-stock',
  imports: [RouterLink, PersianDigitsPipe, TomanPipe, ErrorState],
  templateUrl: './low-stock.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LowStock {
  /** Rows from the API. `null` means "no response yet", `[]` means "none are low". */
  readonly items = input<readonly DashboardLowStockItem[] | null>(null);

  /** Cut-off, inclusive: `stock <= threshold` is listed. */
  readonly threshold = input<number>(LOW_STOCK_THRESHOLD);

  /** The page's own loading state (a re-resolve in flight). */
  readonly loading = input<boolean>(false);

  /**
   * A non-null message means the page's low-stock request rejected (BO-E07 tc 2).
   *
   * Checked FIRST in `state()`: a failure that also left `items` `null` must
   * read as an error, not as the green "everything is fine" block — a dead
   * request must never look like a healthy warehouse.
   */
  readonly error = input<string | null>(null);

  /** Emits the product id; the page owns the navigation. */
  readonly editClick = output<string>();

  /** Emits when the user asks to re-run the failed fetch (BO-E07 tc 3). */
  readonly retry = output<void>();

  /**
   * The single render-state for the card body (BO-E07 tc 7).
   *
   * `error` > `loading` (the existing `showSkeleton`, which is `loading || items
   * === null`) > `empty` (a real "nothing is low" answer — the green check) >
   * `data`. Order matters: `null` items must never fall through to the green
   * "warehouse is healthy" block before the request has even answered.
   */
  readonly state = computed<WidgetState>(() => {
    if (this.error()) {
      return 'error';
    }

    if (this.showSkeleton()) {
      return 'loading';
    }

    if (this.filteredItems().length === 0) {
      return 'empty';
    }

    return 'data';
  });

  /**
   * True while there is nothing trustworthy to show yet.
   *
   * `null` and `[]` are NOT the same thing and must not share a branch: `[]` is
   * a real answer ("the shelves are fine") and deserves the green check; `null`
   * is the absence of an answer and deserves a skeleton.
   */
  readonly showSkeleton = computed<boolean>(() => this.loading() || this.items() === null);

  /**
   * The rows this card is about, lowest stock first (tc 1, tc 9).
   *
   * A copy, then `filter`, then `sort`: `Array.prototype.sort` mutates, and the
   * input is a `readonly` array owned by the caller (in the app, by a signal
   * that other code may read).
   */
  readonly filteredItems = computed<readonly DashboardLowStockItem[]>(() => {
    const list = this.items() ?? [];
    const max = this.threshold();

    return [...list].filter((item) => item.stock <= max).sort((a, b) => a.stock - b.stock);
  });

  /** `0` is the only "cannot sell this" state; negative stock is a data bug, not a stock level. */
  isOutOfStock(stock: number): boolean {
    return stock <= 0;
  }

  /**
   * Badge classes for a stock level (tc 3).
   *
   * Returned as a string for a `[class]` binding rather than split into two
   * `@if`s in the template, so the badge's colour and its label are chosen by
   * the same condition (`isOutOfStock`) and cannot drift apart.
   */
  stockBadgeClass(stock: number): string {
    return this.isOutOfStock(stock)
      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  }

  /** Emits the id of the product the user wants to edit; navigation is the page's job. */
  onEdit(id: string): void {
    this.editClick.emit(id);
  }
}
