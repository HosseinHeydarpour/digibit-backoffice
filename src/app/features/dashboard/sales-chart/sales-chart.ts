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
 * Sales Chart Component (BO-E03)
 *
 * Renders a bar chart of store sales over the selected range (7 or 30 days) using PrimeNG UIChart.
 * Supports OnPush change detection, Jalali date labels, Persian thousand-separated tooltips,
 * responsive dimensions, and theme-aware styling (light/dark mode).
 *
 * TRACE / PRACTICAL USAGE EXAMPLE:
 * ---------------------------------
 * Input `data`:
 *   [
 *     { date: '2026-10-12', value: 15_000_000 },
 *     { date: '2026-10-13', value: 24_500_000 }
 *   ]
 *
 * 1. Label Transformation:
 *    - '2026-10-12' -> new Date('2026-10-12') -> JALALI_FORMATTER.format(...) -> '۲۱ مهر'
 *    - '2026-10-13' -> '۲۲ مهر'
 *
 * 2. Dataset Construction:
 *    - Values: [15000000, 24500000]
 *    - Bar color: #FF8229 (Arino primary brand token)
 *    - Bar thickness: 24px (for 7-day view) or 8px (for 30-day view)
 *
 * 3. Options & Theme:
 *    - If Dark mode is active (`theme.isDark() === true`):
 *      textColor: '#94A3B8' (slate-400), grid: 'rgba(255, 255, 255, 0.08)'
 *    - If Light mode is active:
 *      textColor: '#64748B' (slate-500), grid: 'rgba(0, 0, 0, 0.06)'
 *
 * 4. Tooltip & Ticks callback:
 *    - Hovering over 24_500_000 -> tooltip prints: "فروش: ۲۴٬۵۰۰٬۰۰۰ تومان"
 *    - Y-Axis tick 10000000 -> "۱۰٬۰۰۰٬۰۰۰"
 */
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
    const values = points.map((p) => p.value);

    return {
      labels,
      datasets: [
        {
          label: 'فروش (تومان)',
          data: values,
          backgroundColor: '#FF8229',
          hoverBackgroundColor: '#b76122',
          borderRadius: 6,
          barThickness: this.range() === 30 ? 8 : 24,
        },
      ],
    };
  });

  readonly chartOptions = computed<ChartOptions<'bar'>>(() => {
    const isDark = this.theme.isDark();
    const textColor = isDark ? '#94A3B8' : '#64748B';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          rtl: true,
          callbacks: {
            label: (ctx) => `فروش: ${Number(ctx.raw).toLocaleString('fa-IR')} تومان`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { family: 'Payda, sans-serif' } },
          grid: { display: false },
        },
        y: {
          ticks: {
            color: textColor,
            font: { family: 'Payda, sans-serif' },
            callback: (val) => Number(val).toLocaleString('fa-IR'),
          },
          grid: { color: gridColor },
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
