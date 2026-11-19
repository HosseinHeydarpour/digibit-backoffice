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
  MOCK_CUSTOMERS,
  MOCK_CUSTOMER_DETAILS,
  MOCK_DASHBOARD_SUMMARY,
  MOCK_LOW_STOCK,
  MOCK_ORDERS,
  MOCK_ORDER_DETAILS,
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

    it('gives every point an order count, so both bars of a group exist', () => {
      // The chart draws two bars per day. A missing `orders` would not throw —
      // Chart.js silently draws one bar and the legend lies about the other.
      for (const point of getMockSalesChart(30)) {
        expect(typeof point.orders).toBe('number');
        expect(Number.isInteger(point.orders)).toBe(true);
        expect(point.orders).toBeGreaterThan(0);
      }
    });

    it('ties the order count to the revenue of the SAME day', () => {
      // One series, two readings — a day the chart shows as a peak is a day
      // with more orders. Two hand-written arrays could drift apart; these
      // cannot.
      for (const point of getMockSalesChart(7)) {
        expect(point.orders).toBe(Math.max(1, Math.round(point.value / 1_800_000)));
      }
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

describe('orders fixtures (BO-H01)', () => {
  it('has more rows than the default page, so the paginator has a page 2', () => {
    expect(MOCK_ORDER_DETAILS.length).toBe(28);
    expect(MOCK_ORDER_DETAILS.length).toBeGreaterThan(20);
  });

  it('cycles all seven statuses, including returned', () => {
    const statuses = new Set(MOCK_ORDER_DETAILS.map((order) => order.status));
    expect([...statuses].sort()).toEqual(
      ['cancelled', 'delivered', 'paid', 'pending', 'processing', 'returned', 'shipped'].sort(),
    );
  });

  it('derives every money number: total = subtotal − discount + shipping, subtotal = Σ lines', () => {
    for (const order of MOCK_ORDER_DETAILS) {
      const lineSum = order.items.reduce((sum, item) => sum + item.totalPrice, 0);
      expect(order.subtotal, `subtotal of ${order.code}`).toBe(lineSum);
      expect(order.total, `total of ${order.code}`).toBe(
        order.subtotal - order.discount + order.shippingCost,
      );
      for (const item of order.items) {
        expect(item.totalPrice).toBe(item.unitPrice * item.quantity);
      }
    }
  });

  it('derives itemCount from the item quantities, never hand-written', () => {
    for (const order of MOCK_ORDER_DETAILS) {
      const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
      expect(order.itemCount, `itemCount of ${order.code}`).toBe(units);
    }
  });

  it('projects the list rows from the details, so the two screens agree', () => {
    expect(MOCK_ORDERS.length).toBe(MOCK_ORDER_DETAILS.length);
    MOCK_ORDERS.forEach((row, index) => {
      const detail = MOCK_ORDER_DETAILS[index];
      expect(row).toEqual({
        id: detail.id,
        code: detail.code,
        customerId: detail.customerId,
        customerName: detail.customerName,
        status: detail.status,
        total: detail.total,
        itemCount: detail.itemCount,
        createdAt: detail.createdAt,
      });
    });
  });

  it('keeps every history timestamp at or before the fixture clock', () => {
    for (const order of MOCK_ORDER_DETAILS) {
      expect(order.createdAt).toBeLessThanOrEqual(FIXTURE_NOW);
      for (const entry of order.statusHistory) {
        expect(entry.createdAt, `${order.code} history`).toBeLessThanOrEqual(FIXTURE_NOW);
      }
      // The history ends at the order's own status — the badge and the last
      // timeline entry can never disagree.
      expect(order.statusHistory[order.statusHistory.length - 1].status).toBe(order.status);
    }
  });

  it('marks unpaid orders honestly: no gateway, no tracking, no paidAt', () => {
    for (const order of MOCK_ORDER_DETAILS) {
      if (order.status === 'pending' || order.status === 'cancelled') {
        expect(order.payment.paidAt).toBeNull();
        expect(order.payment.gateway).toBeNull();
        expect(order.payment.trackingCode).toBeNull();
      } else {
        expect(order.payment.paidAt).toBeGreaterThan(order.createdAt);
      }
    }
  });

  it('has a discounted order and a free-shipping order on page 1', () => {
    const firstPage = MOCK_ORDER_DETAILS.slice(0, 20);
    expect(firstPage.some((order) => order.discount > 0)).toBe(true);
    expect(firstPage.some((order) => order.shippingCost === 0)).toBe(true);
  });

  it('feeds the dashboard tile from these same rows, not a hand-written pair', () => {
    // «سفارش‌های جدید» prints pendingOrders over orderCount; the orders list
    // prints MOCK_ORDER_DETAILS.length. Two sources for one shop would let the
    // tile say 342 while the list a click away says 28.
    expect(MOCK_DASHBOARD_SUMMARY.orderCount).toBe(MOCK_ORDER_DETAILS.length);
    expect(MOCK_DASHBOARD_SUMMARY.pendingOrders).toBe(
      MOCK_ORDER_DETAILS.filter((order) => order.status === 'pending').length,
    );
  });

  it('hangs items off real catalogue rows', () => {
    const ids = new Set(MOCK_PRODUCTS.map((product) => product.id));
    for (const order of MOCK_ORDER_DETAILS) {
      for (const item of order.items) {
        expect(ids.has(item.productId), `${item.productName} exists`).toBe(true);
      }
    }
  });
});

describe('customer fixtures (BO-I04)', () => {
  it('is the dashboard customer count, not a second hand-written number', () => {
    expect(MOCK_DASHBOARD_SUMMARY.customerCount).toBe(MOCK_CUSTOMER_DETAILS.length);
  });

  it('keeps ids unique and has both an active and a blocked row', () => {
    const ids = new Set(MOCK_CUSTOMERS.map((customer) => customer.id));
    expect(ids.size).toBe(MOCK_CUSTOMERS.length);
    expect(MOCK_CUSTOMERS.every((customer) => typeof customer.id === 'string')).toBe(true);
    expect(MOCK_CUSTOMERS.some((customer) => customer.status === 'blocked')).toBe(true);
    expect(MOCK_CUSTOMERS.some((customer) => customer.status === 'active')).toBe(true);
  });

  it('links every order to a real customer who owns it', () => {
    const byId = new Map(MOCK_CUSTOMER_DETAILS.map((customer) => [customer.id, customer]));

    for (const order of MOCK_ORDER_DETAILS) {
      const owner = byId.get(order.customerId);
      expect(owner, `order ${order.code} has an owner`).toBeDefined();
      expect(owner?.fullName).toBe(order.customerName);
    }
  });

  it('derives orderCount and totalSpent, skipping cancelled and returned orders', () => {
    for (const customer of MOCK_CUSTOMER_DETAILS) {
      const orders = MOCK_ORDER_DETAILS.filter((order) => order.customerId === customer.id);
      const paid = orders.filter(
        (order) => order.status !== 'cancelled' && order.status !== 'returned',
      );

      expect(customer.orderCount).toBe(orders.length);
      expect(customer.totalSpent).toBe(paid.reduce((sum, order) => sum + order.total, 0));
    }
  });

  it('gives the first customer more than five orders for the profile limit', () => {
    expect(MOCK_CUSTOMER_DETAILS[0].orderCount).toBeGreaterThan(5);
  });

  it('gives every customer at least one address, with exactly one default', () => {
    for (const customer of MOCK_CUSTOMER_DETAILS) {
      expect(customer.addresses.length).toBeGreaterThan(0);
      expect(customer.addresses.filter((address) => address.isDefault)).toHaveLength(1);
    }
  });
});
