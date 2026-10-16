// src/app/shared/components/empty-state/empty-state.ts
//
// WHAT THIS IS
// ------------
// The panel's «there is nothing here» block: a large muted glyph, a sentence
// saying what is missing, an optional second line saying what to do about it,
// and an optional primary button that does it.
//
//   <app-empty-state />
//   <app-empty-state icon="pi pi-search" title="نتیجه‌ای یافت نشد" />
//   <app-empty-state
//     title="هنوز محصولی ثبت نشده"
//     description="اولین کالای فروشگاه را اضافه کنید."
//     actionLabel="افزودن محصول"
//     (action)="openCreateForm()"
//   />
//
// WHY EVERY INPUT HAS A DEFAULT
// -----------------------------
// The two most common empty states are a list with no rows (tc 5) and a search
// with no hits (tc 6), and their wording differs — «هنوز محصولی ثبت نشده» versus
// «نتیجه‌ای یافت نشد». If `title` were required, every search page would have to
// restate a sentence the component already knows, and one of the two would drift.
// The defaults ARE that pair, so the common cases need no configuration:
//
//   no title given  → «موردی برای نمایش وجود ندارد»   (the neutral list case)
//   title given     → rendered verbatim                (tc 6 overrides it)
//
// WHY THE BUTTON IS DRIVEN BY `actionLabel`, NOT BY `action`
// ---------------------------------------------------------
// `output()` returns an `OutputEmitterRef`, whose public API is `emit()` and
// `subscribe()` — there is no way to ask it whether anybody is listening. (The
// RxJS-based `EventEmitter` does expose an `observed` getter, which is the likely
// source of the confusion; this project uses the signal API instead, as
// stat-card.ts documents for the same reason.)
//
// So the label is what decides whether a button exists, and the output is how it
// reports. Two consequences, both good:
//
//   * tc 1 — no `actionLabel` → no button, no leftover margin, no empty flex row
//   * tc 10 — `[actionLabel]="null"` → same as absent, because the signal is
//     just falsy. There is no separate null branch to forget.
//
// A caller who binds `(action)` but forgets `actionLabel` gets no button and no
// error, which is why the label is the documented "this component is actionable"
// switch — the same contract page-header uses for its projected actions.
//
// WHY `role="status"` AND NOT `role="alert"`
// ------------------------------------------
// An empty state is the RESULT of a load, not an interruption. `alert` makes a
// screen reader cut off whatever it was reading; `status` announces politely at
// the next pause. That is the right weight for «نتیجه‌ای یافت نشد».
// ============================================================================

import { Component, input, output } from '@angular/core';

/**
 * The universal "nothing here" block for lists, searches and empty pages.
 *
 * @example A search with no hits — the defaults already say the right thing
 * ```html
 * <app-empty-state icon="pi pi-search" title="نتیجه‌ای یافت نشد" />
 * ```
 *
 * @example An empty list with a way out
 * ```html
 * <app-empty-state
 *   title="هنوز محصولی ثبت نشده"
 *   description="اولین کالای فروشگاه را اضافه کنید."
 *   actionLabel="افزودن محصول"
 *   (action)="openCreateForm()"
 * />
 * ```
 */
@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
})
export class EmptyState {
  /**
   * PrimeIcons class list for the large muted glyph at the top.
   *
   * Omitted → the neutral `pi pi-inbox` (tc 3). The default is a closed box
   * because it says "nothing was put here", which is true of every caller — the
   * callers that deserve a sharper glyph (a search, a filter) pass one.
   *
   * @example icon="pi pi-search" · icon="pi pi-filter" · icon="pi pi-inbox"
   */
  readonly icon = input<string>('pi pi-inbox');

  /**
   * The headline sentence. Omitted → «موردی برای نمایش وجود ندارد» (tc 3).
   *
   * Override it when the REASON is more useful than the fact: a search says
   * «نتیجه‌ای یافت نشد» (tc 6), a filtered list says «فیلتری اعمال نشد» — the
   * user needs to know which of the two empty states they are looking at,
   * because the way out differs.
   */
  readonly title = input<string>('موردی برای نمایش وجود ندارد');

  /**
   * One muted line under the title, e.g. «اولین کالای فروشگاه را اضافه کنید.»
   *
   * Omitted → no paragraph is rendered at all (not an empty one), so a
   * title-only state has no stray margin.
   */
  readonly description = input<string>();

  /**
   * Text of the optional primary button, e.g. «افزودن محصول» · «پاک کردن
   * فیلترها».
   *
   * THIS IS THE SWITCH that makes the component actionable. Omitted or `null` →
   * no button is rendered (tc 1, tc 10). See the header for why it is the label
   * and not the output that decides.
   */
  readonly actionLabel = input<string | null>();

  /**
   * Emitted when the action button is clicked.
   *
   * Bind it together with `actionLabel`; on its own it produces no button, so
   * this can never fire without one.
   *
   * Navigation stays the caller's business — a shared block has no business
   * knowing about the router.
   */
  readonly action = output<void>();
}
