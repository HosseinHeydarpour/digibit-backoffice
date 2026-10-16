// src/app/shared/components/stat-card/stat-card.ts
//
// WHAT THIS IS
// ------------
// One KPI tile: a label, a big value, an optional unit, an optional icon bubble
// and an optional footer strip. The dashboard (BO-E02) lays several out in a
// grid; the summary pages reuse the same tile.
//
// This component is a REPRODUCTION of the four summary cards in the design
// reference — `arino/page/fa/admin-panel-index.html`, lines 481-561. All four of
// those cards are this one component with different inputs:
//
//   card 1  فروش امروز       tone=neutral   footerText + a trend pill
//   card 2  کاربران جدید     tone=positive  footerText + a link
//   card 3  تعداد محصولات    tone=negative  footerText + a link
//   card 4  سفارشات جدید     tone=warning   a progress bar
//
// WHY EVERY COLOUR IS A LOOKUP TABLE
// ----------------------------------
// A variant class such as `dark:text-green-400` contains a colon, and
// `bg-green-900/30` contains a slash — neither can be bound through
// `[class.x]="…"` in a template. Binding the whole class list instead
// (`[class]="toneStyles().bubble"`) works, and Angular MERGES that list with any
// static `class` on the same element, so layout stays in the template and colour
// stays in the table below. That is what lets one element hold both
// `class="h-12 w-12 rounded-xl"` and a four-way colour branch without four
// copies of the markup.
//
// WHY `value` IS A PRE-FORMATTED STRING
// -------------------------------------
// The task's «اجرای بهینه» asks for exactly this: Persian digits, the thousands
// separator and «تومان» arrive ready to print. The component knows nothing about
// currencies or calendars, which is what makes it a pure function of its inputs
// and one test file enough for every tile on the dashboard.
//
// The unit is a SEPARATE input because the reference renders it in a smaller
// font inside the same line: `42,850,000 <span class="text-sm">تومان</span>`.
//
// ```html
// <app-stat-card
//   value="۴۲٬۸۵۰٬۰۰۰"
//   unit="تومان"
//   label="فروش امروز"
//   icon="pi pi-dollar"
//   tone="neutral"
//   footerText="افزایش ۱۲٪ نسبت به دیروز"
//   trend="up"
//   trendPercent="۱۲٪"
// />
// ```
//
// A card with only the two required inputs is a valid read-only tile — it simply
// has no footer, and the footer strip hides itself when it has nothing to show:
//
// ```html
// <app-stat-card value="۱۴۷" label="تعداد محصولات" />
// ```
//
// `icon` is a PrimeIcons class list ("pi pi-shopping-cart") — the same shape
// PrimeNG's own components accept for their `icon` input.
//
// BECOMING CLICKABLE IS OPT-IN
// ----------------------------
// Turn `actionable` on and the card behaves like a button: pointer cursor,
// keyboard focus stop, Enter/Space activation. Leave it off (the default) and
// the tile is inert — no cursor, no focus stop, never a fake button.
//
// WHY `input()` AND NOT `@Input()`
// --------------------------------
// The project is signal-based end to end. `input()` yields a read-only signal,
// so the template reads `value()` and can never reassign it, and
// `input.required` turns "someone forgot the value" into a compile error instead
// of an empty tile.
// ============================================================================

import { Component, computed, input, output } from '@angular/core';

/**
 * Which way the number moved. Drives the trend pill only.
 *
 * Kept separate from `Tone` on purpose: a tile can count users going UP while
 * the icon bubble is red because the metric itself is a bad one. Direction and
 * accent are independent ideas, and the reference uses them that way.
 */
export type Trend = 'up' | 'down' | 'neutral';

/**
 * Accent colour of the icon bubble (and of the progress bar, when there is one).
 *
 *   positive — green, a good number went up            (reference card 2, users)
 *   negative — red, something is wrong or went down    (reference card 3, products)
 *   neutral  — the brand orange, no judgement either way (reference card 1, sales)
 *   warning  — amber/yellow, something needs watching  (reference card 4, orders)
 *
 * The task describes the first three as «مثبت/منفی/خنثی»; `warning` is the fourth
 * accent the reference's own dashboard uses.
 */
export type Tone = 'positive' | 'negative' | 'neutral' | 'warning';

/**
 * The reference's own colour recipe for each tone, kept in one place so the four
 * accents can never drift apart.
 *
 * Three facets, because the card paints a tone in three different spots:
 *
 *   bubble   — the tinted icon square: a 100-step tint with a 600-step glyph
 *              (900/30% + 400 in dark mode),
 *   bar      — the progress bar's fill: the 500 step (400 in dark mode),
 *   barLabel — the small percentage beside that bar: the 600 step.
 *
 * These values are copied from the reference's compiled CSS. Our own accent
 * tokens (`--color-success`, `--color-danger`, `--color-warning`) are two-value
 * (base + -dark) and cannot express a 100/600 pair, so a tile that wants the
 * reference's exact tint would have nothing to point at. See the handover note
 * if the project would rather route these through the tokens.
 */
const TONE_STYLES: Record<Tone, { bubble: string; bar: string; barLabel: string }> = {
  positive: {
    bubble: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    bar: 'bg-green-500 dark:bg-green-400',
    barLabel: 'text-green-600 dark:text-green-400',
  },
  negative: {
    bubble: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    bar: 'bg-red-500 dark:bg-red-400',
    barLabel: 'text-red-600 dark:text-red-400',
  },
  neutral: {
    bubble: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
    bar: 'bg-primary-500 dark:bg-primary-400',
    barLabel: 'text-primary-600 dark:text-primary-400',
  },
  warning: {
    bubble: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    bar: 'bg-yellow-500 dark:bg-yellow-400',
    barLabel: 'text-yellow-600 dark:text-yellow-400',
  },
};

/**
 * The trend pill's colours, per direction — the reference's green/red pairing.
 *
 * `arrow` is empty for a neutral trend: there is no direction to point at, so
 * the pill is grey and carries no glyph.
 */
const TREND_STYLES: Record<Trend, { pill: string; arrow: string }> = {
  up: {
    pill: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    arrow: 'pi pi-arrow-up',
  },
  down: {
    pill: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    arrow: 'pi pi-arrow-down',
  },
  neutral: {
    pill: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    arrow: '',
  },
};

/**
 * One KPI tile for the dashboard and the summary pages.
 *
 * @example The reference's first card, one-for-one
 * ```html
 * <app-stat-card
 *   value="۴۲٬۸۵۰٬۰۰۰"
 *   unit="تومان"
 *   label="فروش امروز"
 *   icon="pi pi-dollar"
 *   tone="neutral"
 *   footerText="افزایش ۱۲٪ نسبت به دیروز"
 *   trend="up"
 *   trendPercent="۱۲٪"
 * />
 * ```
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
   * Examples: '۴۲٬۸۵۰٬۰۰۰' (with `unit="تومان"`) · '۱۴۷' (a plain count).
   */
  readonly value = input.required<string>();

  /**
   * What the number represents, rendered above the value in muted small text.
   *
   * Examples: «فروش امروز» · «کاربران جدید» · «تعداد محصولات».
   */
  readonly label = input.required<string>();

  /**
   * The unit that belongs to the value, printed beside it in a smaller font:
   * «تومان» · «کاربر» · «محصول» · «سفارش».
   *
   * Omitted → the value line is just the number.
   */
  readonly unit = input<string>();

  /**
   * PrimeIcons class list for the bubble glyph. Omitted → no bubble at all
   * (not an empty circle).
   *
   * @example icon="pi pi-shopping-cart" · icon="pi pi-users"
   */
  readonly icon = input<string>();

  /**
   * Accent colour of the bubble, and of the progress bar when one is shown.
   * Defaults to `neutral` — the brand orange, the reference's default.
   */
  readonly tone = input<Tone>('neutral');

  /**
   * Which way the number moved versus the previous period. Drives the pill's
   * colour and its arrow; on its own it renders nothing.
   */
  readonly trend = input<Trend>('neutral');

  /**
   * The pill's text at the inline-end of the footer, e.g. '۱۲٪'. Omitted → no
   * pill. Its colour and arrow come from `trend`.
   *
   * The reference prints this percentage twice on purpose: once spelled out in
   * `footerText` («افزایش ۱۲٪ نسبت به دیروز») and once as the scannable pill.
   */
  readonly trendPercent = input<string>();

  /**
   * The muted sentence at the inline-start of the footer, e.g.
   * «افزایش ۱۲٪ نسبت به دیروز» or «۱۵ کاربر فعال امروز».
   *
   * Omitted → the footer keeps only whatever else it was given.
   */
  readonly footerText = input<string>();

  /**
   * Progress towards some goal, 0-100, e.g. `[progress]="85"`. Present → the
   * footer shows the reference's bar variant instead of the text/pill row.
   *
   * Values outside 0-100 are clamped, so a bad number cannot draw a bar that
   * overflows its track. `0` is a real value (an empty bar); the bar only
   * disappears when the input is `undefined`.
   */
  readonly progress = input<number>();

  /**
   * The small percentage at the inline-end of the progress variant, e.g.
   * «۸۵٪ تحویل شده». Coloured with the card's `tone`.
   */
  readonly progressText = input<string>();

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

  /** The icon bubble's tint + glyph colour for the current tone. */
  protected readonly bubbleClasses = computed(() => TONE_STYLES[this.tone()].bubble);

  /** The progress bar's fill colour for the current tone. */
  protected readonly barClasses = computed(() => TONE_STYLES[this.tone()].bar);

  /** The progress bar's small percentage colour for the current tone. */
  protected readonly barLabelClasses = computed(() => TONE_STYLES[this.tone()].barLabel);

  /** The trend pill's tint + text colour for the current direction. */
  protected readonly pillClasses = computed(() => TREND_STYLES[this.trend()].pill);

  /** The pill's glyph, or `''` for a neutral trend (nothing to point at). */
  protected readonly trendArrow = computed(() => TREND_STYLES[this.trend()].arrow);

  /**
   * The bar's width in percent, clamped to the track.
   *
   * A `computed` rather than a template expression so the clamping is written
   * once, is testable, and never runs twice per change detection pass.
   */
  protected readonly progressWidth = computed(() => {
    const percent = this.progress();

    if (percent === undefined) {
      return 0;
    }

    return Math.min(100, Math.max(0, percent));
  });

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
