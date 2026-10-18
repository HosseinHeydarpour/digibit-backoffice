import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThemeService } from '@core/services/theme';

import type { SalesChartPoint, SalesChartRange } from '../models/dashboard.model';

import { SalesChart } from './sales-chart';

const SAMPLE_7_DAYS: SalesChartPoint[] = [
  { date: '2026-10-12', value: 14_000_000 },
  { date: '2026-10-13', value: 18_500_000 },
  { date: '2026-10-14', value: 22_000_000 },
  { date: '2026-10-15', value: 16_000_000 },
  { date: '2026-10-16', value: 29_000_000 },
  { date: '2026-10-17', value: 21_000_000 },
  { date: '2026-10-18', value: 35_000_000 },
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
      const mockContext = {
        raw: 14000000,
        dataset: { label: 'فروش (تومان)' },
      } as unknown as Parameters<typeof tooltipCallback>[0];

      const tooltipText = tooltipCallback.call({} as never, mockContext);
      expect(tooltipText).toContain('۱۴٬۰۰۰٬۰۰۰');
      expect(tooltipText).toContain('تومان');
    }
  });

  it('declares responsive and maintainAspectRatio: false (tc 5)', () => {
    fixture.componentRef.setInput('data', SAMPLE_7_DAYS);
    fixture.detectChanges();

    const options = component.chartOptions();
    expect(options.responsive).toBe(true);
    expect(options.maintainAspectRatio).toBe(false);
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
});
