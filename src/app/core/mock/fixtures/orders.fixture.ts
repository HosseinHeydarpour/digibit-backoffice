// src/app/core/mock/fixtures/orders.fixture.ts
//
// The orders dataset (BO-H01). Two exports, one source:
//
//   MOCK_ORDER_DETAILS — 28 full records: items, address, payment, history.
//   MOCK_ORDERS        — the list rows, PROJECTED from the details, so the
//                        table and the detail page can never disagree about
//                        one order's total, status or item count.
//
// THE ONE-NUMBER RULE (same as the dashboard's sales fixtures)
// -----------------------------------------------------------
// Every amount is DERIVED, never hand-written twice:
//   item.totalPrice = unitPrice × quantity
//   subtotal        = Σ item.totalPrice
//   total           = subtotal − discount + shippingCost
//   itemCount       = Σ item.quantity
// A fixture where `total` is typed by hand next to the items is a fixture that
// will eventually print a totals card the items table contradicts.
//
// Items hang off REAL catalogue rows (`MOCK_PRODUCTS`), so a product name,
// price and variant in an order are the same ones the products screen shows.
// The catalogue's photos are empty strings in the mock; `productImage` maps
// that to `null` so the detail page renders its placeholder honestly.
//
// WHY 28 ROWS AND A 9-HOUR STEP
// -----------------------------
// 28 > the default page size of 20, so the paginator has a real second page.
// `createdAt = now − (i*9 + 14)h` spreads the set over ~10.5 days (BO-H02's
// Jalali range filter will have something to cut), and the 14-hour buffer
// keeps every status-history timestamp (up to +10h) at or before FIXTURE_NOW.
//
// All SEVEN statuses cycle, including `returned` — the badge mapping and the
// detail history need their red and full-flow cases reachable in the mock.

import type { OrderStatus } from '@shared/models/status-badge.model';

import { FIXTURE_NOW, MOCK_PRODUCTS } from './products.fixture';

const HOUR = 3_600_000;

/** The same eight shoppers as `MOCK_CUSTOMERS`, with the same phone formula. */
const CUSTOMERS = [
  'زهرا محمدی',
  'علی رضایی',
  'مریم حسینی',
  'رضا کریمی',
  'سارا احمدی',
  'محمد نوری',
  'نگار شریفی',
  'سید محمدحسین حسینی‌نژاد موسوی',
] as const;

/** Province/city pairs cycled across the orders, so the address card varies. */
const REGIONS = [
  { province: 'تهران', city: 'تهران' },
  { province: 'اصفهان', city: 'اصفهان' },
  { province: 'خراسان رضوی', city: 'مشهد' },
  { province: 'فارس', city: 'شیراز' },
  { province: 'آذربایجان شرقی', city: 'تبریز' },
] as const;

const STREETS = [
  'خیابان ولیعصر، کوچهٔ شهید نوری، پلاک ۱۲، واحد ۴',
  'بلوار کشاورز، کوچهٔ دوم، پلاک ۸، طبقهٔ سوم',
  'خیابان انقلاب، نبش کوچهٔ مهر، پلاک ۴۵، واحد ۷',
  'بلوار معلم، کوچهٔ یاس، پلاک ۳، واحد ۱',
  'خیابان آزادی، کوچهٔ شهید کاظمی، پلاک ۲۷، طبقهٔ دوم',
] as const;

/** The seven statuses in lifecycle order, cycled so every badge is reachable. */
const STATUS_CYCLE: readonly OrderStatus[] = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
];

/** Paid shipping cycles three carriers; free orders say so. */
const SHIPPING_NAMES = ['پست پیشتاز', 'تیپاکس', 'پیک تهران'] as const;

export interface MockOrderItem {
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly productImage: string | null;
  readonly variantName: string | null;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly totalPrice: number;
}

export interface MockOrderHistoryEntry {
  readonly id: string;
  readonly status: OrderStatus;
  readonly note: string | null;
  readonly createdAt: number;
}

export interface MockOrder {
  readonly id: string;
  readonly code: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly status: OrderStatus;
  readonly total: number;
  readonly itemCount: number;
  readonly createdAt: number;
  readonly items: readonly MockOrderItem[];
  readonly subtotal: number;
  readonly discount: number;
  readonly shippingCost: number;
  readonly shippingMethod: string;
  readonly address: {
    readonly fullName: string;
    readonly phone: string;
    readonly province: string;
    readonly city: string;
    readonly postalCode: string;
    readonly address: string;
  };
  readonly payment: {
    readonly method: string;
    readonly gateway: string | null;
    readonly trackingCode: string | null;
    readonly paidAt: number | null;
  };
  readonly statusHistory: readonly MockOrderHistoryEntry[];
}

/** 1–3 lines per order, each a real catalogue row with a real price. */
function buildItems(orderIndex: number, orderId: string): MockOrderItem[] {
  const lineCount = (orderIndex % 3) + 1;

  return Array.from({ length: lineCount }, (_, line) => {
    const product = MOCK_PRODUCTS[(orderIndex * 3 + line) % MOCK_PRODUCTS.length];
    // Every other line takes the product's first variant when one exists, so
    // the detail table shows both the variant and the simple-product case.
    const variant =
      product.variants.length > 0 && (orderIndex + line) % 2 === 0 ? product.variants[0] : null;
    const quantity = ((orderIndex + line) % 3) + 1;
    const unitPrice = variant ? variant.price : product.price;

    return {
      id: `${orderId}-item-${line + 1}`,
      productId: product.id,
      productName: product.name,
      productImage: product.image === '' ? null : product.image,
      variantName: variant?.name ?? null,
      quantity,
      unitPrice,
      totalPrice: unitPrice * quantity,
    };
  });
}

/** The happy-path lifecycle; cancelled forks early, returned extends it. */
const LIFECYCLE: readonly OrderStatus[] = ['pending', 'paid', 'processing', 'shipped', 'delivered'];

/**
 * The lifecycle up to `status`, one entry every 2 hours.
 *
 * cancelled forks right after pending (the customer never paid); returned
 * walks the whole flow and adds the return. Notes exist only where a human
 * wrote a reason — the timeline must have both kinds of entry.
 */
function buildHistory(
  orderId: string,
  status: OrderStatus,
  createdAt: number,
): MockOrderHistoryEntry[] {
  const flow: readonly OrderStatus[] =
    status === 'pending'
      ? ['pending']
      : status === 'cancelled'
        ? ['pending', 'cancelled']
        : status === 'returned'
          ? [...LIFECYCLE, 'returned']
          : LIFECYCLE.slice(0, LIFECYCLE.indexOf(status) + 1);

  return flow.map((step, index) => ({
    id: `${orderId}-h${index + 1}`,
    status: step,
    note:
      step === 'cancelled'
        ? 'انصراف مشتری از خرید'
        : step === 'returned'
          ? 'مرجوعی به دلیل مغایرت کالا'
          : null,
    createdAt: createdAt + index * 2 * HOUR,
  }));
}

function buildOrder(i: number): MockOrder {
  const id = String(i + 1);
  // Orders 25..28 return to the first shopper, so the profile's five-row limit
  // has a customer with more than five orders to demonstrate.
  const customerIndex = i >= 24 ? 0 : i % CUSTOMERS.length;
  const customerName = CUSTOMERS[customerIndex];
  const status = STATUS_CYCLE[i % STATUS_CYCLE.length];
  const createdAt = FIXTURE_NOW - (i * 9 + 14) * HOUR;
  const region = REGIONS[i % REGIONS.length];

  const items = buildItems(i, id);
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  // Every fifth order carries a 10% coupon; every sixth ships free. Both are
  // reachable on page 1, so the totals card has all three shapes to show.
  const discount = i % 5 === 0 ? Math.round(subtotal * 0.1) : 0;
  const shippingCost = i % 6 === 5 ? 0 : 45_000;
  const paid = status !== 'pending' && status !== 'cancelled';

  return {
    id,
    code: `ORD-${14000 + i}`,
    customerId: String(customerIndex + 1),
    customerName,
    status,
    total: subtotal - discount + shippingCost,
    itemCount,
    createdAt,
    items,
    subtotal,
    discount,
    shippingCost,
    shippingMethod: shippingCost === 0 ? 'ارسال رایگان' : SHIPPING_NAMES[i % SHIPPING_NAMES.length],
    address: {
      fullName: customerName,
      phone: `0912${String(1000000 + customerIndex * 11111)}`,
      province: region.province,
      city: region.city,
      postalCode: String(1100000000 + i * 1010101),
      address: STREETS[i % STREETS.length],
    },
    payment: {
      method: 'پرداخت آنلاین',
      gateway: paid ? 'زرین‌پال' : null,
      trackingCode: paid ? String(202600000000 + i * 7919) : null,
      paidAt: paid ? createdAt + 10 * 60_000 : null,
    },
    statusHistory: buildHistory(id, status, createdAt),
  };
}

export const MOCK_ORDER_DETAILS: readonly MockOrder[] = Array.from({ length: 28 }, (_, i) =>
  buildOrder(i),
);

/**
 * The list rows — a projection, not a second dataset. The dashboard's
 * recent-orders widget reads the same rows, so «سفارش‌های اخیر» and the orders
 * table agree about every number they both show.
 */
export const MOCK_ORDERS = MOCK_ORDER_DETAILS.map((order) => ({
  id: order.id,
  code: order.code,
  customerId: order.customerId,
  customerName: order.customerName,
  status: order.status,
  total: order.total,
  itemCount: order.itemCount,
  createdAt: order.createdAt,
}));
