import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThemeService } from '@core/services/theme';
import { formatPersianDate } from '@shared/pipes/persian-date.pipe';
import { formatDigits } from '@shared/pipes/persian-digits.pipe';
import { formatToman } from '@shared/pipes/toman.pipe';

import type { SalesChartPoint, SalesChartRange } from '../models/dashboard.model';

import { SalesChart } from './sales-chart';

const SAMPLE_7_DAYS: SalesChartPoint[] = [
  { date: '2026-10-12', value: 14_000_000, orders: 8 },
  { date: '2026-10-13', value: 18_500_000, orders: 10 },
  { date: '2026-10-14', value: 22_000_000, orders: 12 },
  { date: '2026-10-15', value: 16_000_000, orders: 9 },
  { date: '2026-10-16', value: 29_000_000, orders: 16 },
  { date: '2026-10-17', value: 21_000_000, orders: 12 },
  { date: '2026-10-18', value: 35_000_000, orders: 19 },
];

const mock2DContext: Record<string, unknown> = new Proxy(
  {
    canvas: null,
    measureText: () => ({ width: 0 }),
    getImageData: () => ({ data: [] }),
  },
  {
    get(target, prop) {
      if (prop in target) {
        return (target as Record<string, unknown>)[prop as string];
      }
      return () => {
        /* no-op for mock canvas methods */
      };
    },
  },
);

describe('SalesChart (BO-E03)', () => {
  let fixture: ComponentFixture<SalesChart>;
  let component: SalesChart;
  let themeService: ThemeService;
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

  beforeAll(() => {
    if (typeof window !== 'undefined' && !('CanvasRenderingContext2D' in window)) {
      (window as unknown as Record<string, unknown>)['CanvasRenderingContext2D'] =
        class CanvasRenderingContext2D {};
    }

    if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
      (window as unknown as Record<string, unknown>)['ResizeObserver'] = class ResizeObserver {
        observe(): void {
          /* no-op */
        }
        unobserve(): void {
          /* no-op */
        }
        disconnect(): void {
          /* no-op */
        }
      };
    }

    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string) {
      if (contextId === '2d') {
        const ctx = Object.create(mock2DContext);
        ctx.canvas = this;
        return ctx as CanvasRenderingContext2D;
      }
      return null;
    } as typeof HTMLCanvasElement.prototype.getContext;
  });

  afterAll(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesChart],
    }).compileComponents();

    fixture = TestBed.createComponent(SalesChart);
    component = fixture.componentInstance;
    themeService = TestBed.inject(ThemeService);
  });

  it('renders with 7-day data (tc 1, tc 8)', () => {
    fixture.componentRef.setInput('data', SAMPLE_7_DAYS);
    fixture.componentRef.setInput('range', 7);
    fixture.detectChanges();

    const chartData = component.chartData();
    expect(chartData.labels?.length).toBe(7);
    expect(chartData.datasets[0].data.length).toBe(7);
    expect(fixture.nativeElement.querySelector('p-chart')).toBeTruthy();
  });

  it('emits rangeChange when clicking 30-day button (tc 2)', () => {
    fixture.componentRef.setInput('data', SAMPLE_7_DAYS);
    fixture.componentRef.setInput('range', 7);
    fixture.detectChanges();

    let emittedRange: SalesChartRange | null = null;
    component.rangeChange.subscribe((r) => {
      emittedRange = r;
    });

    const buttons = fixture.nativeElement.querySelectorAll('button');
    // Button 0: 7 days, Button 1: 30 days
    buttons[1].click();

    expect(emittedRange).toBe(30);
  });

  it('formats axis labels as Jalali dates (tc 3)', () => {
    fixture.componentRef.setInput('data', SAMPLE_7_DAYS);
    fixture.detectChanges();

    const labels = component.chartData().labels as string[];
    expect(labels.length).toBe(7);
    // Jalali short month name format in Persian, e.g. "مهر"
    expect(labels.some((label) => label.includes('مهر'))).toBe(true);
  });

  it('formats tooltip value with thousands separator and unit (tc 4)', () => {
    fixture.componentRef.setInput('data', SAMPLE_7_DAYS);
    fixture.detectChanges();

    const options = component.chartOptions();
    const tooltipCallback = options.plugins?.tooltip?.callbacks?.label;
    expect(tooltipCallback).toBeDefined();

    if (typeof tooltipCallback === 'function') {
      // The revenue series: full Toman amount plus the unit.
      const revenueContext = {
        raw: 14_000_000,
        dataset: { label: 'درآمد (میلیون تومان)', yAxisID: 'revenue' },
      } as unknown as Parameters<typeof tooltipCallback>[0];

      const revenueText = tooltipCallback.call({} as never, revenueContext);
      expect(revenueText).toContain('۱۴٬۰۰۰٬۰۰۰');
      expect(revenueText).toContain('تومان');

      // The order series: a count, and never the currency.
      const ordersContext = {
        raw: 19,
        dataset: { label: 'تعداد سفارشات', yAxisID: 'orders' },
      } as unknown as Parameters<typeof tooltipCallback>[0];

      const ordersText = tooltipCallback.call({} as never, ordersContext);
      expect(ordersText).toContain('۱۹');
      expect(ordersText).not.toContain('تومان');
    }
  });

  it('draws two bars per period — orders and revenue — on separate axes', () => {
    fixture.componentRef.setInput('data', SAMPLE_7_DAYS);
    fixture.detectChanges();

    const datasets = component.chartData().datasets;
    expect(datasets).toHaveLength(2);

    // Order matters: blue is the left bar of every group, like the reference.
    expect(datasets[0].label).toBe('تعداد سفارشات');
    expect(datasets[0].data).toEqual([8, 10, 12, 9, 16, 12, 19]);
    expect(datasets[0].yAxisID).toBe('orders');

    // Revenue stays in Toman; only the axis label divides by a million.
    expect(datasets[1].label).toBe('درآمد (میلیون تومان)');
    expect(datasets[1].data).toEqual(SAMPLE_7_DAYS.map((p) => p.value));
    expect(datasets[1].yAxisID).toBe('revenue');

    const scales = component.chartOptions().scales;
    expect(scales?.['orders']?.position).toBe('left');
    expect(scales?.['revenue']?.position).toBe('right');

    // Exactly one axis draws grid lines, or the plot becomes a fence.
    expect(scales?.['orders']?.grid?.display).not.toBe(false);
    expect(scales?.['revenue']?.grid?.display).toBe(false);
  });

  it('prints revenue ticks in millions but order ticks as whole counts', () => {
    fixture.componentRef.setInput('data', SAMPLE_7_DAYS);
    fixture.detectChanges();

    const scales = component.chartOptions().scales;
    const revenueTick = scales?.['revenue']?.ticks?.callback as (v: unknown) => string;
    const ordersTick = scales?.['orders']?.ticks?.callback as (v: unknown) => string;

    expect(revenueTick(35_000_000)).toBe('۳۵');
    expect(ordersTick(19)).toBe('۱۹');
    // A count never grows a fractional tick.
    const ordersTicks = scales?.['orders']?.ticks as { precision?: number } | undefined;
    expect(ordersTicks?.precision).toBe(0);
  });

  it('declares responsive and maintainAspectRatio: false (tc 5)', () => {
    fixture.componentRef.setInput('data', SAMPLE_7_DAYS);
    fixture.detectChanges();

    const options = component.chartOptions();
    expect(options.responsive).toBe(true);
    expect(options.maintainAspectRatio).toBe(false);
  });

  it('grows with its grid row instead of sitting at a fixed height', () => {
    fixture.componentRef.setInput('data', SAMPLE_7_DAYS);
    fixture.detectChanges();

    // The card shares an `xl` row with the low-stock list. A fixed `h-72` made
    // it the shorter of the two; `h-full` takes the row and `flex-1` on the
    // plot wrapper hands the extra space to the CHART, not to a blank strip.
    const card = fixture.nativeElement.querySelector(':scope > div') as HTMLElement;
    expect(card.classList.contains('h-full')).toBe(true);
    expect(card.classList.contains('flex-col')).toBe(true);

    const plot = card.querySelector('.relative.flex-1') as HTMLElement;
    expect(plot).toBeTruthy();
    // The floor is a min-height, not a height — otherwise `flex-1` has nothing
    // to grow into.
    expect(plot.classList.contains('min-h-72')).toBe(true);
    expect(plot.classList.contains('h-72')).toBe(false);
  });

  it('swaps colors for dark mode (tc 6)', () => {
    themeService.set('light');
    fixture.componentRef.setInput('data', SAMPLE_7_DAYS);
    fixture.detectChanges();

    const lightOptions = component.chartOptions();
    const lightTextColor = lightOptions.scales?.['x']?.ticks?.color;

    themeService.set('dark');
    fixture.detectChanges();

    const darkOptions = component.chartOptions();
    const darkTextColor = darkOptions.scales?.['x']?.ticks?.color;

    expect(lightTextColor).not.toEqual(darkTextColor);
    expect(darkTextColor).toBe('#94A3B8');
  });

  it('shows empty message when data is empty or null (tc 7)', () => {
    fixture.componentRef.setInput('data', []);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('داده‌ای نیست');
    expect(el.querySelector('p-chart')).toBeNull();

    fixture.componentRef.setInput('data', null);
    fixture.detectChanges();
    expect(el.textContent).toContain('داده‌ای نیست');
    expect(el.querySelector('p-chart')).toBeNull();
  });

  it('renders spinner when loading is true', () => {
    fixture.componentRef.setInput('data', SAMPLE_7_DAYS);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('.pi-spinner');
    expect(spinner).toBeTruthy();
    expect(fixture.nativeElement.querySelector('p-chart')).toBeNull();
  });

  it('runs without console errors (tc 10)', () => {
    const originalError = console.error;
    let errors = 0;
    console.error = () => {
      errors++;
    };

    try {
      fixture.componentRef.setInput('data', SAMPLE_7_DAYS);
      fixture.detectChanges();
      expect(errors).toBe(0);
    } finally {
      console.error = originalError;
    }
  });

  it('labels its axis and tooltip with the shared formatters (BO-E06 tc 1, tc 7)', () => {
    fixture.componentRef.setInput('data', SAMPLE_7_DAYS);
    fixture.detectChanges();

    // The x axis is the same function the persianDate pipe wraps — the chart
    // used to build its own Intl.DateTimeFormat here.
    expect(component.chartData().labels?.[0]).toBe(formatPersianDate('2026-10-12', 'dayMonth'));

    const label = component.chartOptions().plugins?.tooltip?.callbacks?.label as (
      ctx: unknown,
    ) => string;

    // Both units come from the shared functions, so the tooltip cannot print a
    // count with a currency suffix, or an amount without one.
    expect(label({ raw: 35_000_000, dataset: { yAxisID: 'revenue' } })).toBe(
      `درآمد: ${formatToman(35_000_000)}`,
    );
    expect(label({ raw: 19, dataset: { yAxisID: 'orders' } })).toBe(`سفارشات: ${formatDigits(19)}`);
  });
});
