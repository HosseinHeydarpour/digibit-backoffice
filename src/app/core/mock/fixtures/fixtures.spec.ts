// src/app/core/mock/fixtures/fixtures.spec.ts
//
// The fixtures are data, but the dashboard's NUMBERS are derived from them —
// so a fixture is worth a test when two widgets read the same question and
// could answer it differently.
//
// The bug this file exists for: «فروش امروز» printed 1,284,500,000 while the
// last bar of «آمار فروش» drew 84,000,000. Both came from this folder, from two
// hand-written values that nobody had ever compared. Every assertion below is
// a "these two must stay equal" that a human cannot be relied on to check.

import { FIXTURE_NOW, MOCK_PRODUCTS } from './products.fixture';

import {
  MOCK_DASHBOARD_SUMMARY,
  MOCK_LOW_STOCK,
  MOCK_SALES_CHART,
  getMockSalesChart,
} from './index';

/** Mirrors `LOW_STOCK_THRESHOLD` in `features/dashboard/dashboard.config.ts`. */
const THRESHOLD = 5;

const DAY = 86_400_000;

describe('dashboard fixtures', () => {
  describe('the two sales numbers agree', () => {
    it("totalSales is the chart's LAST point — the «فروش امروز» tile and today's bar", () => {
      const today = MOCK_SALES_CHART[MOCK_SALES_CHART.length - 1];

      expect(MOCK_DASHBOARD_SUMMARY.totalSales).toBe(today.value);
    });

    it('salesChangePercent is derived from the last two bars, not typed by hand', () => {
      const today = MOCK_SALES_CHART[MOCK_SALES_CHART.length - 1].value;
      const yesterday = MOCK_SALES_CHART[MOCK_SALES_CHART.length - 2].value;
      const expected = Math.round(((today - yesterday) / yesterday) * 1000) / 10;

      expect(MOCK_DASHBOARD_SUMMARY.salesChangePercent).toBe(expected);
    });

    it("the chart's last point is dated today", () => {
      const today = MOCK_SALES_CHART[MOCK_SALES_CHART.length - 1].date;
      const expected = new Date(FIXTURE_NOW).toISOString().split('T')[0];

      expect(today).toBe(expected);
    });
  });

  describe('the sales series', () => {
    it('returns 7 points by default and 30 when asked', () => {
      expect(getMockSalesChart()).toHaveLength(7);
      expect(getMockSalesChart(7)).toHaveLength(7);
      expect(getMockSalesChart(30)).toHaveLength(30);
    });

    it('agrees with itself on the days the two ranges share', () => {
      // A range switch must not redraw the same day at a different height:
      // the series is a function of the DATE, not of the array index.
      const week = getMockSalesChart(7);
      const month = getMockSalesChart(30);

      expect(month.slice(-7)).toEqual(week);
    });

    it('walks back one day per point, ending on the fixture clock', () => {
      const chart = getMockSalesChart(7);

      chart.forEach((point, i) => {
        const offset = chart.length - 1 - i;
        expect(point.date).toBe(new Date(FIXTURE_NOW - offset * DAY).toISOString().split('T')[0]);
      });
    });
  });

  describe('low stock', () => {
    it('lists every product at or below the threshold, and nothing above it', () => {
      const expected = MOCK_PRODUCTS.filter((p) => p.stock <= THRESHOLD);

      expect(MOCK_LOW_STOCK.map((p) => p.id)).toEqual(expected.map((p) => p.id));
      expect(MOCK_LOW_STOCK.every((p) => p.stock <= THRESHOLD)).toBe(true);
    });

    it('the summary count is the length of that list', () => {
      expect(MOCK_DASHBOARD_SUMMARY.lowStockCount).toBe(MOCK_LOW_STOCK.length);
    });

    it('has both an out-of-stock row and a low-but-available row', () => {
      // BO-E05 tc 3 needs both badge colours to be reachable in mock mode; a
      // fixture of only zeros would leave the yellow badge untested by eye.
      expect(MOCK_LOW_STOCK.some((p) => p.stock === 0)).toBe(true);
      expect(MOCK_LOW_STOCK.some((p) => p.stock > 0)).toBe(true);
    });

    it('productCount is the size of the catalogue', () => {
      expect(MOCK_DASHBOARD_SUMMARY.productCount).toBe(MOCK_PRODUCTS.length);
    });
  });
});
