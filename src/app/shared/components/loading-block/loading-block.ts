// src/app/shared/components/loading-block/loading-block.ts
//
// WHAT THIS IS
// ------------
// The «the real content is on its way» block: `<ng-content>` while loading is
// false, and a skeleton that MIRRORS the projected content while it is true.
//
//   <app-loading-block [loading]="loading()" variant="cards">…</app-loading-block>
//
// WHY IT WRAPS CONTENT INSTEAD OF BEING AN `@if` YOU WRITE YOURSELF
// -----------------------------------------------------------------
// The accepted shape of a list page is
//
//   @if (loading()) { <skeleton stuff> } @else { <real table> }
//
// and it has two failure modes that a wrapper removes by construction:
//
//   1. The two branches drift. Someone changes the table's padding, nobody
//      changes the skeleton, and every load produces a visible jump when the
//      content arrives — which is exactly what tc 6 forbids. Keeping the real
//      markup in ONE place and the placeholder in ONE place means the only thing
//      that can drift is the variant name, and that is a closed union.
//   2. The skeleton is invented per page. Three developers produce three
//      skeletons at three opacities. The variants below are the whole vocabulary;
//      a new shape is a change here, reviewed once, for every page at once.
//
// WHY THE SKELETON IS NOT A PROP OF `stat-card` / `p-table`
// --------------------------------------------------------
// The task's «اجرای بهینه» suggests a `[loading]` input on the list components
// themselves. This block achieves the same result without that cost: a component
// that owns its own skeleton must know how tall it is, how many columns a table
// has, and what a form looks like — which is the page's knowledge, not the
// component's. It would also mean every present and future list component
// re-implements the same three variants. Here they are defined once.
//
// WHY `role="status"` IS ON THE BLOCK AND NOT ON THE SKELETONS
// ------------------------------------------------------------
// PrimeNG's `p-skeleton` hard-codes `attr.aria-hidden: "true"` on its host
// (primeng/fesm2022/primeng-skeleton.mjs:117), which is correct — a rectangle
// with no text has nothing to announce. So the announcement has to come from the
// container. One polite `aria-busy` region around the whole placeholder is the
// right weight: it says "this area is loading" once, instead of the screen reader
// walking five silent boxes.
//
// The skeleton shapes are also `aria-hidden` for the same reason they are
// rectangles: they carry no information, and the COUNT of them (five rows, three
// cards) is layout, not data. Nothing is lost by hiding them; the `status` line
// is the payload.
// ============================================================================

import { Component, computed, input } from '@angular/core';
import { Skeleton } from 'primeng/skeleton';

/**
 * The placeholder shapes the panel actually needs. A closed union, for the same
 * reason `Permission` is one in menu.model.ts: a typo must be a compile error,
 * not a silently-empty skeleton.
 *
 * - `cards`  — a stat-card / product-card grid (tc 1)
 * - `table`  — a `p-table` body with `rows` placeholder rows (tc 3)
 * - `form`   — a vertical form: label, field, label, field (tc 4)
 * - `list`   — stacked rows with a leading circle, for feeds and activity
 * - `text`   — paragraph lines, for a detail page header
 */
export type LoadingVariant = 'cards' | 'table' | 'form' | 'list' | 'text';

/**
 * Which shapes to draw while `loading` is true, and a place to put the real
 * content.
 *
 * @example A table page — five placeholder rows, matching the real page size
 * ```html
 * <app-loading-block [loading]="loading()" variant="table" [rows]="5">
 *   <p-table [value]="orders()">…</p-table>
 * </app-loading-block>
 * ```
 *
 * @example A dashboard's stat-card row
 * ```html
 * <app-loading-block [loading]="loading()" variant="cards" [columns]="4">
 *   <app-stat-card … />
 * </app-loading-block>
 * ```
 */
@Component({
  selector: 'app-loading-block',
  imports: [Skeleton],
  templateUrl: './loading-block.html',
  styleUrl: './loading-block.scss',
})
export class LoadingBlock {
  /**
   * `true` while the data is in flight.
   *
   * Required, not defaulted to `false`. A block that silently defaults to "not
   * loading" renders the real content against an empty signal and shows a flash
   * of «موردی برای نمایش وجود ندارد» before the data lands — the most common
   * loading bug there is. Making it required turns that into a compile error.
   */
  readonly loading = input.required<boolean>();

  /** Which placeholder shape to draw. */
  readonly variant = input<LoadingVariant>('cards');

  /**
   * How many placeholder rows/items to draw.
   *
   * Defaults to 5, which is also what tc 3 asks for. Pass the real page size when
   * it is known (`[rows]="pageSize()"`) so the block reserves the height the
   * content will actually occupy — that is what makes tc 6 («بدون پرش بصری»)
   * hold even on a short final page.
   */
  readonly rows = input<number>(5);

  /**
   * How many cards per row/column at the widest breakpoint.
   *
   * Only read by `variant="cards"`. The count is not cosmetic: it decides how
   * many placeholders to draw, and drawing four where the real grid shows three
   * makes the page grow then shrink.
   */
  readonly columns = input<number>(4);

  /** How many label+field pairs the `form` variant draws. */
  readonly fields = input<number>(3);

  /**
   * The row numbers `@for` iterates over.
   *
   * `@for` needs a collection, not a count, and building `[]` in the template is
   * not expressible — so the array is derived here. `track $index` is correct
   * even though the values repeat: a placeholder row has no identity of its own,
   * and its only use is its position.
   */
  protected readonly rowIndexes = computed(() =>
    Array.from({ length: this.rows() }, (_, index) => index),
  );

  /** Same, for the `cards` variant's placeholder tiles. */
  protected readonly cardIndexes = computed(() =>
    Array.from({ length: this.columns() }, (_, index) => index),
  );

  /** Same, for the `form` variant's label+field pairs. */
  protected readonly fieldIndexes = computed(() =>
    Array.from({ length: this.fields() }, (_, index) => index),
  );
}
