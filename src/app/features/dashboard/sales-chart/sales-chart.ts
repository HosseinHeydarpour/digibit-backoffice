// src/app/features/dashboard/sales-chart/sales-chart.ts
//
// WHAT THIS IS
// ------------
// The «آمار فروش» card (BO-E03): a grouped bar chart of the last 7 or 30 days,
// two bars per day — order count on the left axis, revenue on the right.
//
// WHY TWO BARS AND TWO AXES
// -------------------------
// The design reference's own chart (`arino/…/admin-panel-index.html`) draws a
// group per period with «تعداد سفارشات» beside «درآمد». One bar per day, which
// this chart used to draw, hides the interesting case: a day that earns more
// while selling fewer, more expensive things. The two metrics cannot share a
// scale — 14-35 MILLION Toman against 8-25 orders would flatten the orders into
// the axis — so each gets its own, and the legend says which bar is which.
//
// EVERY LABEL GOES THROUGH THE SHARED FORMATTERS (BO-E06)
// -------------------------------------------------------
// A chart labels its axes and its tooltip from TypeScript, where a pipe cannot
// reach. This file used to build its own `Intl.DateTimeFormat` and call
// `toLocaleString('fa-IR')` three times, so the same amount could render one
// way in a table and another way in a tooltip. It now calls `formatPersianDate`,
// `formatToman` and `formatDigits` — the same functions the pipes wrap — and
// reads the currency word from `TOMAN_UNIT`.
//
// THE FOUR STATES (BO-E07)
// ------------------------
// The card now reads a single `state()` — loading / error / empty / data — so a
// rejected fetch shows the same retry block as the other widgets instead of
// falling through to the chart with no data, and the loading spinner is the
// FIRST branch, never an afterthought.
//
// TRACE / PRACTICAL USAGE EXAMPLE
// -------------------------------
// Input `data`:
//   [
//     { date: '2026-10-17', value: 21_000_000, orders: 12 },
//     { date: '2026-10-18', value: 35_000_000, orders: 19 },
//   ]
// Input `range`: 7     Input `loading`: false     Input `error`: null
//
// 1. `state()` → 'data' (no error, not loading, two points).
//
// 2. Labels — `formatPersianDate('2026-10-17', 'dayMonth')` → «۲۵ مهر»,
//    «۲۶ مهر». The date-only string is parsed as a CALENDAR date (local), so a
//    viewer in a negative offset does not see the previous day; an unparseable
//    value renders «—» rather than «Invalid Date».
//
// 3. Datasets — TWO, in this order (the reference's own order, so blue is
//    always the left bar of a group):
//      [0] «تعداد سفارشات»  data [12, 19]        yAxisID 'orders'  (left)
//      [1] «درآمد (میلیون تومان)» data [21e6, 35e6] yAxisID 'revenue' (right)
//
// 4. Axes — `orders` counts from 0 with `precision: 0` (a tick at ۱۲٫۵ orders
//    would be nonsense) and labels its ticks with `formatDigits`; `revenue`
//    also starts at 0 but its tick CALLBACK divides by 1e6 and formats through
//    `formatToman(…, { unit: false })`, so the axis reads ۰ / ۱۰ / ۲۰ / ۳۰
//    while the underlying value stays exact Toman.
//
// 5. Tooltip — the callback branches on `dataset.yAxisID`, so hovering the blue
//    bar prints «سفارشات: ۱۹» and the green one prints
//    «درآمد: ۳۵٬۰۰۰٬۰۰۰ تومان». One formatter per unit, and the currency word
//    comes from `TOMAN_UNIT` — a count can never be printed with «تومان».
//
// 6. Bar width — `barThickness` is 22px for a 7-day range and 8px for 30, so 30
//    groups of two bars still fit a phone. `borderRadius` follows it down, or an
//    8px bar becomes a 6px pill with two flat sides.
//
// 7. Failure path — `error` arrives instead of `data`:
//    `state()` resolves to 'error' BEFORE 'loading' (a `null` payload), so the
//    chart area shows the retry block, never a blank canvas. «تلاش دوباره»
//    emits `retry`, and the page re-runs the sales request for the same range.
//
// WHAT THIS COMPONENT DOES NOT DO
// -------------------------------
// It does not fetch (the page does, through `DashboardService.salesChart`) and
// it does not know what a "day" costs. `rangeChange` reports the button the user
// pressed; the page decides what to request. `retry` does the same for a failed
// fetch.

import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { ThemeService } from '@core/services/theme';
import { ErrorState } from '@shared/components/error-state/error-state';
import { formatPersianDate } from '@shared/pipes/persian-date.pipe';
import { formatDigits } from '@shared/pipes/persian-digits.pipe';
import { formatToman, TOMAN_UNIT } from '@shared/pipes/toman.pipe';
import type { ChartData, ChartOptions } from 'chart.js';
import { UIChart } from 'primeng/chart';

import type { SalesChartPoint, SalesChartRange } from '../models/dashboard.model';
import type { WidgetState } from '../models/widget-state';

/**
 * The reference chart's palette: blue for the count, green for the money.
 *
 * Deliberately NOT the brand orange, which is used for both bars before this
 * change: with two series, one of them has to give, and the reference already
 * solved this pair. The hover shades are the same hue one step darker, so the
 * bar under the cursor is identifiable without a second colour language.
 */
const ORDER_COLOR = '#7BA7F7';
const ORDER_HOVER = '#5B8FE8';
const REVENUE_COLOR = '#4BC0A0';
const REVENUE_HOVER = '#3AA88B';

/** Revenue tick labels are printed in millions; the dataset keeps Toman. */
const TOMAN_PER_MILLION = 1_000_000;

/** Axis keys — referenced by both the datasets and `scales`, so they cannot drift. */
const ORDERS_AXIS = 'orders';
const REVENUE_AXIS = 'revenue';

/**
 * The revenue series' name, in the legend and on the axis title.
 *
 * One constant, because the legend and the axis title must say the same thing —
 * and because the unit word inside it comes from `TOMAN_UNIT` rather than a
 * second literal (BO-E06 tc 4).
 */
const REVENUE_LABEL = `درآمد (میلیون ${TOMAN_UNIT})`;

@Component({
  selector: 'app-sales-chart',
  imports: [UIChart, ErrorState],
  templateUrl: './sales-chart.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesChart {
  private readonly theme = inject(ThemeService);

  readonly data = input<readonly SalesChartPoint[] | null>(null);
  readonly range = input<SalesChartRange>(7);
  readonly loading = input<boolean>(false);

  /**
   * A non-null message means the page's sales request rejected (BO-E07 tc 2).
   *
   * Checked FIRST in `state()`: a failure that also left `data` `null` must read
   * as an error, not as a blank chart.
   */
  readonly error = input<string | null>(null);

  readonly rangeChange = output<SalesChartRange>();

  /** Emits when the user asks to re-run the failed fetch (BO-E07 tc 3). */
  readonly retry = output<void>();

  readonly hasData = computed(() => {
    const d = this.data();
    return Boolean(d && d.length > 0);
  });

  /**
   * The single render-state for the card body (BO-E07 tc 7).
   *
   * `error` wins; then the explicit `loading` flag (the page sets it true while
   * the chart's OWN request is in flight — `chartLoading` — so a null payload
   * that simply has not answered yet reads as "loading", not "empty"); then a
   * `null` OR empty payload reads as `empty` (a real "no points" answer);
   * then `data`. `null` is empty rather than loading here because the page
   * already owns the spinner via `loading`, and an empty array and a missing
   * array are the same "nothing to draw" outcome for a chart.
   */
  readonly state = computed<WidgetState>(() => {
    if (this.error()) {
      return 'error';
    }

    if (this.loading()) {
      return 'loading';
    }

    if (!this.hasData()) {
      return 'empty';
    }

    return 'data';
  });

  readonly chartData = computed<ChartData<'bar'>>(() => {
    const points = this.data() ?? [];
    const labels = points.map((p) => formatPersianDate(p.date, 'dayMonth'));

    // Two bars share one slot, so each is narrower than a solo bar was. The
    // radius has to follow: an 8px bar with a 6px radius is a lozenge.
    const barThickness = this.range() === 30 ? 8 : 22;
    const borderRadius = this.range() === 30 ? 3 : 6;

    return {
      labels,
      datasets: [
        {
          label: 'تعداد سفارشات',
          data: points.map((p) => p.orders),
          backgroundColor: ORDER_COLOR,
          hoverBackgroundColor: ORDER_HOVER,
          borderRadius,
          barThickness,
          yAxisID: ORDERS_AXIS,
        },
        {
          label: REVENUE_LABEL,
          data: points.map((p) => p.value),
          backgroundColor: REVENUE_COLOR,
          hoverBackgroundColor: REVENUE_HOVER,
          borderRadius,
          barThickness,
          yAxisID: REVENUE_AXIS,
        },
      ],
    };
  });

  readonly chartOptions = computed<ChartOptions<'bar'>>(() => {
    const isDark = this.theme.isDark();
    const textColor = isDark ? '#94A3B8' : '#64748B';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const font = { family: 'Payda, sans-serif' };

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        // Two series need a key. It is RTL like the rest of the panel, and uses
        // rounded squares so each swatch reads as "this bar", not "this dot".
        legend: {
          display: true,
          position: 'top',
          rtl: true,
          labels: {
            color: textColor,
            usePointStyle: true,
            pointStyle: 'rectRounded',
            boxWidth: 8,
            boxHeight: 8,
            padding: 16,
            font,
          },
        },
        tooltip: {
          rtl: true,
          callbacks: {
            // One callback, two units: the axis the bar belongs to decides what
            // the number means, so a count can never be printed with «تومان».
            label: (ctx) => {
              const raw = Number(ctx.raw);

              return ctx.dataset.yAxisID === REVENUE_AXIS
                ? `درآمد: ${formatToman(raw)}`
                : `سفارشات: ${formatDigits(raw)}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: textColor, font },
          grid: { display: false },
        },
        [ORDERS_AXIS]: {
          position: 'left',
          beginAtZero: true,
          title: { display: true, text: 'تعداد سفارشات', color: textColor, font },
          ticks: {
            color: textColor,
            font,
            // Orders are whole things. Without this, a 0-25 range grows a
            // ۱۲٫۵ tick the moment the data changes.
            precision: 0,
            callback: (val) => formatDigits(val),
          },
          // Only ONE axis draws grid lines. Two sets of horizontal rules, one
          // per scale, is a fence, not a grid.
          grid: { color: gridColor },
        },
        [REVENUE_AXIS]: {
          position: 'right',
          beginAtZero: true,
          title: { display: true, text: REVENUE_LABEL, color: textColor, font },
          ticks: {
            color: textColor,
            font,
            // The data is Toman; only the LABEL is in millions, so the tooltip
            // can still print the exact amount. Same formatter as the tooltip,
            // minus the unit — the axis title already carries it.
            callback: (val) => formatToman(Number(val) / TOMAN_PER_MILLION, { unit: false }),
          },
          grid: { display: false },
        },
      },
    };
  });

  selectRange(r: SalesChartRange): void {
    if (r !== this.range()) {
      this.rangeChange.emit(r);
    }
  }
}
