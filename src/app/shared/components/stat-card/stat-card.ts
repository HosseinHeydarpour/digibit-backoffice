// src/app/shared/components/stat-card/stat-card.ts
//
// WHAT THIS IS
// ------------
// One KPI tile: a big value, its label, an optional icon, an optional trend
// line, and a colour tone. The dashboard (BO-E02) lays several out in a grid.
//
// DESIGN RULE (from the task): the VALUE is a pre-formatted STRING.
//   We accept `value: string` on purpose, e.g. '۱٬۲۴۰' or '۴٬۵۰۰٬۰۰۰ تومان'.
//   Formatting (Persian digits, تومان, thousands separators) happens in the
//   CALLER, which keeps this card dumb and trivially testable — it has zero
//   knowledge of currencies or calendars.
// ============================================================================

import { Component, input, output } from '@angular/core';

/**
 * Direction of change versus the previous period. Drives the arrow and its
 * colour — nothing else.
 *
 * Kept separate from `Tone` on purpose: a card can show a red «کمموجود» bubble
 * with no trend at all, or a green bubble whose number actually went DOWN. The
 * two ideas are independent, and the reference dashboard uses them that way.
 */
export type Trend = 'up' | 'down' | 'neutral';

/**
 * Accent colour of the icon bubble. `neutral` is the brand orange.
 *
 * In the reference dashboard this is what makes the tiles scannable: users are
 * green, products red, orders yellow — picked per metric, not per trend.
 */
export type Tone = 'positive' | 'negative' | 'neutral';

/**
 * One KPI tile for the dashboard and the summary pages.
 *
 * WHY `value` IS A PRE-FORMATTED STRING
 * -------------------------------------
 * Persian digits, the thousands separator and «تومان» arrive ready to print, so
 * this component is a pure function of its inputs and one test file covers every
 * tile on the dashboard:
 *
 * ```html
 * <!-- BO-B16 will allow value="{{ revenue() | toman }}"; until then, format in TS. -->
 * <app-stat-card
 *   value="۴٬۵۰۰٬۰۰۰ تومان"
 *   label="فروش این ماه"
 *   icon="pi pi-shopping-cart"
 *   tone="positive"
 *   trend="up"
 *   trendValue="۱۲٪ نسبت به ماه قبل"
 * />
 * ```
 *
 * A card with only the two required inputs is a valid read-only tile:
 *
 * ```html
 * <app-stat-card value="۱۴۷" label="تعداد محصولات" />
 * ```
 *
 * `icon` is a PrimeIcons class list ("pi pi-shopping-cart") — the same shape
 * PrimeNG's own components accept for their `icon` input.
 *
 * BECOMING CLICKABLE IS OPT-IN
 * ----------------------------
 * Turn `actionable` on and the card behaves like a button: pointer cursor,
 * keyboard focus stop, Enter/Space activation. Leave it off (the default) and
 * the tile is inert — no cursor, no focus stop, never a fake button.
 *
 * WHY `input()` AND NOT `@Input()`
 * --------------------------------
 * The project is signal-based end to end. `input()` yields a read-only signal, so
 * the template reads `value()` and can never reassign it, and `input.required`
 * turns "someone forgot the value" into a compile error instead of an empty tile.
 */
@Component({
  selector: 'app-stat-card',
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.scss',
})
export class StatCard {
  /**
   * The number, ALREADY formatted for display.
   *
   * Examples: '۴٬۵۰۰٬۰۰۰ تومان' (revenue) · '۱۴۷' (a plain count).
   */
  readonly value = input.required<string>();

  /**
   * What the number represents, rendered above the value in muted small text.
   *
   * Examples: «فروش این ماه» · «سفارشات جدید» · «تعداد محصولات».
   */
  readonly label = input.required<string>();

  /**
   * PrimeIcons class list for the bubble glyph. Omitted → no bubble at all
   * (not an empty circle).
   *
   * @example icon="pi pi-shopping-cart" · icon="pi pi-users"
   */
  readonly icon = input<string>();

  /**
   * Accent colour of the icon bubble. Defaults to `neutral` (brand orange).
   */
  readonly tone = input<Tone>('neutral');

  /**
   * Which way the number moved. Defaults to `neutral` — no arrow at all.
   */
  readonly trend = input<Trend>('neutral');

  /**
   * The trend line's text, e.g. '۱۲٪ نسبت به ماه قبل'. Omitted → no trend line.
   *
   * Rendered only when this is set, so a metric with nothing to compare against
   * costs no vertical space.
   */
  readonly trendValue = input<string>();

  /**
   * Whether the tile behaves like a button: pointer cursor, keyboard focus
   * stop, Enter/Space activation, and a visible focus ring.
   *
   * Defaults to `false`, so a plain read-only KPI tile needs no ceremony. Turn
   * it on together with `(cardClick)` when the tile leads somewhere.
   *
   * WHY THIS IS AN EXPLICIT INPUT AND NOT A DETECTED LISTENER
   * --------------------------------------------------------
   * `output()` hands back an `OutputEmitterRef`, whose public API is only
   * `emit()` and `subscribe()` — there is no way to ask it whether anybody is
   * listening. (The RxJS-based `EventEmitter` does expose an `observed` getter,
   * which is the likely source of the confusion; this project uses the signal
   * API instead.) A boolean input is the honest version: the caller says what
   * the tile is, and the template stays a pure function of its inputs.
   */
  readonly actionable = input<boolean>(false);

  /**
   * Emitted when the tile is clicked, or activated with Enter/Space.
   *
   * Bind it together with `actionable` when the tile leads somewhere.
   *
   * @example
   * ```html
   * <app-stat-card
   *   [actionable]="true"
   *   value="۳۸"
   *   label="سفارشات جدید"
   *   (cardClick)="openOrders()"
   * />
   * ```
   */
  readonly cardClick = output<void>();

  /** Click handler — a no-op while the tile is not marked actionable. */
  protected onCardClick(): void {
    if (this.actionable()) {
      this.cardClick.emit();
    }
  }

  /**
   * Enter/Space handler for the focused card. The template only adds `tabindex`
   * while actionable, so this can never fire on a read-only tile.
   */
  protected onCardKey(event: Event): void {
    // Space would otherwise scroll the page and Enter would do nothing; both
    // should behave exactly like a click.
    event.preventDefault();
    this.onCardClick();
  }
}
