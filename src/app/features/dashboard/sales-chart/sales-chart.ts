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
// TRACE / PRACTICAL USAGE EXAMPLE
// -------------------------------
// Input `data`:
//   [
//     { date: '2026-10-17', value: 21_000_000, orders: 12 },
//     { date: '2026-10-18', value: 35_000_000, orders: 19 },
//   ]
// Input `range`: 7     Input `loading`: false
//
// 1. Labels — `new Date('2026-10-17')` → `Intl.DateTimeFormat('fa-IR',
//    {month:'short',day:'numeric'})` → «۲۵ مهر», «۲۶ مهر». An unparseable date
//    falls back to the raw string rather than printing «Invalid Date».
//
// 2. Datasets — TWO, in this order (the reference's own order, so blue is
//    always the left bar of a group):
//      [0] «تعداد سفارشات»  data [12, 19]        yAxisID 'orders'  (left)
//      [1] «درآمد (میلیون تومان)» data [21e6, 35e6] yAxisID 'revenue' (right)
//
// 3. Axes — `orders` counts from 0 with `precision: 0` (a tick at ۱۲٫۵ orders
//    would be nonsense); `revenue` also starts at 0 but its tick CALLBACK
//    divides by 1e6, so the axis reads ۰ / ۱۰ / ۲۰ / ۳۰ while the underlying
//    value stays exact Toman.
//
// 4. Tooltip — the callback branches on `dataset.yAxisID`, so hovering the blue
//    bar prints «سفارشات: ۱۹» and the green one prints
//    «درآمد: ۳۵٬۰۰۰٬۰۰۰ تومان». One formatter, two units, no chance of printing
//    a money amount with no unit.
//
// 5. Bar width — `barThickness` is 22px for a 7-day range and 8px for 30, so 30
//    groups of two bars still fit a phone. `borderRadius` follows it down, or an
//    8px bar becomes a 6px pill with two flat sides.
//
// WHAT THIS COMPONENT DOES NOT DO
// -------------------------------
// It does not fetch (the page does, through `DashboardService.salesChart`) and
// it does not know what a "day" costs. `rangeChange` reports the button the user
// pressed; the page decides what to request.

import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { ThemeService } from '@core/services/theme';
import type { ChartData, ChartOptions } from 'chart.js';
import { UIChart } from 'primeng/chart';

import type { SalesChartPoint, SalesChartRange } from '../models/dashboard.model';

/**
 * Formatter converting Gregorian date string/instant to concise Jalali label (e.g. "۲۱ مهر").
 */
const JALALI_FORMATTER = new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric' });

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

@Component({
  selector: 'app-sales-chart',
  imports: [UIChart],
  templateUrl: './sales-chart.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesChart {
  private readonly theme = inject(ThemeService);

  readonly data = input<readonly SalesChartPoint[] | null>(null);
  readonly range = input<SalesChartRange>(7);
  readonly loading = input<boolean>(false);
  readonly rangeChange = output<SalesChartRange>();

  readonly hasData = computed(() => {
    const d = this.data();
    return Boolean(d && d.length > 0);
  });

  readonly chartData = computed<ChartData<'bar'>>(() => {
    const points = this.data() ?? [];
    const labels = points.map((p) => {
      const dt = new Date(p.date);
      return Number.isNaN(dt.getTime()) ? String(p.date) : JALALI_FORMATTER.format(dt);
    });

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
          label: 'درآمد (میلیون تومان)',
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
              const value = Number(ctx.raw).toLocaleString('fa-IR');

              return ctx.dataset.yAxisID === REVENUE_AXIS
                ? `درآمد: ${value} تومان`
                : `سفارشات: ${value}`;
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
            callback: (val) => Number(val).toLocaleString('fa-IR'),
          },
          // Only ONE axis draws grid lines. Two sets of horizontal rules, one
          // per scale, is a fence, not a grid.
          grid: { color: gridColor },
        },
        [REVENUE_AXIS]: {
          position: 'right',
          beginAtZero: true,
          title: { display: true, text: 'درآمد (میلیون تومان)', color: textColor, font },
          ticks: {
            color: textColor,
            font,
            // The data is Toman; only the LABEL is in millions, so the tooltip
            // can still print the exact amount.
            callback: (val) => (Number(val) / TOMAN_PER_MILLION).toLocaleString('fa-IR'),
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
