import type { SessionUser } from '@shared/models/session.model';

import { MOCK_CUSTOMER_DETAILS } from './customers.fixture';
import { MOCK_ORDER_DETAILS } from './orders.fixture';
import { FIXTURE_NOW, MOCK_PRODUCTS } from './products.fixture';

export { FIXTURE_NOW, MOCK_BRANDS, MOCK_PRODUCTS } from './products.fixture';
export type { MockProduct, MockProductStatus } from './products.fixture';
export { MOCK_ORDERS, MOCK_ORDER_DETAILS } from './orders.fixture';
export type { MockOrder } from './orders.fixture';
export { MOCK_CUSTOMERS, MOCK_CUSTOMER_DETAILS, toCustomerListItem } from './customers.fixture';
export type { MockCustomer, MockCustomerAddress, MockCustomerDetail } from './customers.fixture';
export { MOCK_COUPONS } from './coupons.fixture';
export type { MockCoupon, MockCouponType } from './coupons.fixture';
export { MOCK_SHIPPING_METHODS } from './shipping.fixture';
export type { MockShippingMethod } from './shipping.fixture';
export { MOCK_BANNERS } from './banners.fixture';
export type { MockBanner } from './banners.fixture';
export { MOCK_CONTENT_PAGES } from './content-pages.fixture';
export type { MockContentPage } from './content-pages.fixture';
export { MOCK_SETTINGS } from './settings.fixture';
export type { MockSettings } from './settings.fixture';
export type { SessionUser } from '@shared/models/session.model';

/** 12 modules, matching the 12 feature folders. */
export type MockModule =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'brands'
  | 'orders'
  | 'customers'
  | 'coupons'
  | 'shipping'
  | 'banners'
  | 'settings'
  | 'comments'
  | 'tickets';

const pad = (n: number): string => String(n);
/** Single clock for every fixture, so generated dates are consistent. */
const now = FIXTURE_NOW;
const DAY = 86_400_000;

/** Generic list generator — enough shape for any table to render. */
function makeList<T extends object>(count: number, build: (i: number) => T): T[] {
  return Array.from({ length: count }, (_, i) => build(i));
}

/**
 * The categories the product export actually references (`pcat-*` ids are the
 * source's own ids, kept verbatim so `product.categoryId` resolves). The source
 * carries ids but no names, so the Persian labels are inferred from what each
 * category sells; the three rows with an empty `categoryId` land in
 * «بدون دسته‌بندی». Flat on purpose — the export has no hierarchy either.
 */
export const MOCK_CATEGORIES = [
  {
    id: 'pcat-stationery',
    parentId: null,
    name: 'لوازم تحریر',
    slug: 'stationery',
    order: 1,
    isActive: true,
  },
  {
    id: 'pcat-stationery-paper',
    parentId: 'pcat-stationery',
    name: 'دفتر و کاغذ',
    slug: 'paper',
    order: 1,
    isActive: true,
  },
  {
    id: 'pcat-stationery-pens',
    parentId: 'pcat-stationery',
    name: 'خودکار و روان‌نویس',
    slug: 'pens',
    order: 2,
    isActive: false,
  },
  {
    id: 'pcat-storage',
    parentId: null,
    name: 'حافظه و ذخیره‌سازی',
    slug: 'storage',
    order: 2,
    isActive: true,
  },
  {
    id: 'pcat-cables',
    parentId: null,
    name: 'کابل و تبدیل',
    slug: 'cables',
    order: 3,
    isActive: true,
  },
  {
    id: 'pcat-mu9z7h08e5pm5',
    parentId: null,
    name: 'لوازم جانبی موبایل',
    slug: 'mobile-accessories',
    order: 4,
    isActive: true,
  },
  {
    id: 'pcat-mobile-phones',
    parentId: 'pcat-mu9z7h08e5pm5',
    name: 'گوشی موبایل',
    slug: 'phones',
    order: 1,
    isActive: true,
  },
  {
    id: 'pcat-mobile-cases',
    parentId: 'pcat-mu9z7h08e5pm5',
    name: 'قاب و محافظ',
    slug: 'cases',
    order: 2,
    isActive: true,
  },
  {
    id: 'pcat-accessories',
    parentId: null,
    name: 'لوازم کامپیوتر',
    slug: 'computer-accessories',
    order: 5,
    isActive: true,
  },
  {
    id: 'pcat-muaw2q5j55ern',
    parentId: null,
    name: 'باتری',
    slug: 'batteries',
    order: 6,
    isActive: true,
  },
  {
    id: 'pcat-mu9z8q1hpcc7r',
    parentId: null,
    name: 'روشنایی',
    slug: 'lighting',
    order: 7,
    isActive: true,
  },
  {
    id: 'pcat-uncategorized',
    parentId: null,
    name: 'بدون دسته‌بندی',
    slug: 'uncategorized',
    order: 8,
    isActive: true,
  },
  // BO-G04 needs a branch that is EMPTY of products but not empty of children,
  // otherwise the transfer/cascade dialog has no reachable case in the mock:
  // every other root sells something, and a category with products is refused.
  {
    id: 'pcat-audio',
    parentId: null,
    name: 'صوتی و تصویری',
    slug: 'audio-video',
    order: 9,
    isActive: true,
  },
  {
    id: 'pcat-audio-headphones',
    parentId: 'pcat-audio',
    name: 'هدفون',
    slug: 'headphones',
    order: 1,
    isActive: true,
  },
];

export interface MockComment {
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly productSlug: string;
  readonly userName: string;
  readonly body: string;
  readonly rating: number | null;
  readonly status: 'pending' | 'approved' | 'rejected';
  readonly createdAt: number;
  readonly moderationNote: string | null;
}

const COMMENT_BODIES = [
  'کیفیت ساخت خیلی خوبه، سریع هم رسید. پیشنهاد می‌کنم.',
  'همون چیزی بود که در عکس دیدم. بسته‌بندی سالم رسید.',
  'متأسفانه گوشی با خط و خش رسید و پشتیبانی هم جواب نداد.',
  'برای قیمتش عالیه. باتری یک روز کامل جواب می‌ده.',
  'ارسال دیر شد ولی محصول بی‌عیب بود.',
  'کیفیت صدا خوبه، فقط کابلش کوتاهه.',
  'دفتر و خودکارها دقیقاً مثل توضیحات بودن.',
  'بعد از دو هفته استفاده هنوز مثل روز اوله.',
  'اشتباه سفارش دادم، مرجوعی سخت بود.',
  'قیمت نسبت به کیفیت منصفانه‌ست.',
];

export const MOCK_COMMENTS: readonly MockComment[] = makeList<MockComment>(18, (i) => {
  const product = MOCK_PRODUCTS[i % MOCK_PRODUCTS.length];

  return {
    id: pad(i + 1),
    productId: product.id,
    productName: product.name,
    productSlug: product.slug,
    userName: ['کاربر مهمان', 'زهرا م.', 'علی ر.', 'مریم ح.', 'رضا ک.', 'سارا ا.'][i % 6],
    body: COMMENT_BODIES[i % COMMENT_BODIES.length],
    // Every fifth review has no score, so «بدون امتیاز» exists in the list and
    // not only in a spec (BO-N04 tc 8).
    rating: i % 5 === 4 ? null : (i % 5) + 1,
    status: (['pending', 'approved', 'rejected'] as const)[i % 3],
    createdAt: now - i * (DAY / 2),
    moderationNote: i % 3 === 2 ? 'محتوای نامناسب' : null,
  };
});

export const MOCK_TICKETS = makeList(8, (i) => ({
  id: pad(i + 1),
  code: `TK-${2400 + i}`,
  userId: pad((i % 8) + 1),
  userName: [
    'زهرا محمدی',
    'علی رضایی',
    'مریم حسینی',
    'رضا کریمی',
    'سارا احمدی',
    'محمد نوری',
    'نگار شریفی',
    'امیر صادقی',
  ][i],
  subject: `پیگیری سفارش شماره ${14000 + i}`,
  status: ['open', 'pending', 'closed'][i % 3],
  priority: i % 3 === 0 ? 'high' : 'normal',
  unread: i % 4 === 0,
  lastMessageAt: now - i * 7_200_000,
}));

/**
 * A week of daily sales, in Toman — `[today, yesterday, …]`.
 *
 * A fixed shape, not a formula, because two other fixtures are DERIVED from
 * its last two entries: `totalSales` (today's bar) and `salesChangePercent`
 * (today vs yesterday). A store's week is not a straight line, and the numbers
 * only have to be stable, not realistic to the Rial.
 */
const WEEKLY_SALES = [
  42_000_000, 37_400_000, 33_900_000, 36_200_000, 31_500_000, 34_800_000, 29_600_000,
];

/**
 * Sales for `offset` days before the fixture clock (0 = today).
 *
 * Older weeks are scaled down by 5% each, so a 30-day chart still reads as a
 * business that is growing instead of a flat wall of equal bars.
 */
function salesFor(offset: number): number {
  const week = Math.floor(offset / WEEKLY_SALES.length);
  return Math.round(WEEKLY_SALES[offset % WEEKLY_SALES.length] * (1 - week * 0.05));
}

/**
 * Orders implied by a day's revenue.
 *
 * The average order in this catalogue is worth about 1.8 million Toman, so the
 * two bars of a chart group move together: a day the chart shows as a revenue
 * peak is also a day with more orders. DERIVED rather than a second
 * hand-written series, for the same reason `totalSales` is derived from the
 * last bar — two numbers that describe one day must not be able to disagree.
 *
 * `Math.max(1, …)` keeps a very quiet day at one order instead of zero, so the
 * order axis never collapses to a single flat line at the bottom.
 */
function ordersFor(sales: number): number {
  return Math.max(1, Math.round(sales / 1_800_000));
}

export function getMockSalesChart(days = 7): { date: string; value: number; orders: number }[] {
  const count = days === 30 ? 30 : 7;
  return Array.from({ length: count }, (_, i) => {
    const offset = count - 1 - i;
    const value = salesFor(offset);

    return {
      date: new Date(now - offset * DAY).toISOString().split('T')[0],
      value,
      orders: ordersFor(value),
    };
  });
}

export const MOCK_SALES_CHART = getMockSalesChart(7);

/**
 * Today's and yesterday's bars.
 *
 * These are the single source of truth for the two sales numbers on the
 * dashboard, and that is the point. `totalSales` used to be a hand-written
 * `1_284_500_000` while the chart drew its own series: the «فروش امروز» tile
 * claimed 1.28 billion and the last bar of «آمار فروش» showed 84 million, on
 * the same screen, in the same mock. Two numbers, one question — the fixtures
 * have to be derived from one series, exactly as a real API would be.
 */
const TODAY_SALES = MOCK_SALES_CHART[MOCK_SALES_CHART.length - 1].value;
const YESTERDAY_SALES = MOCK_SALES_CHART[MOCK_SALES_CHART.length - 2].value;

/**
 * Products at or below the dashboard's default threshold (BO-E05).
 *
 * The `5` is a local constant, not an import: `core/` must never depend on
 * `features/` (AGENTS.md, "a feature may import from core, never the other way
 * round"). It mirrors `LOW_STOCK_THRESHOLD` in `features/dashboard/dashboard.config.ts`, and the
 * fixture spec pins the two together.
 */
const MOCK_LOW_STOCK_THRESHOLD = 5;

export const MOCK_LOW_STOCK = MOCK_PRODUCTS.filter((p) => p.stock <= MOCK_LOW_STOCK_THRESHOLD);

export const MOCK_DASHBOARD_SUMMARY = {
  totalSales: TODAY_SALES,
  orderCount: MOCK_ORDER_DETAILS.length,
  customerCount: MOCK_CUSTOMER_DETAILS.length,
  productCount: MOCK_PRODUCTS.length,
  salesChangePercent: Math.round(((TODAY_SALES - YESTERDAY_SALES) / YESTERDAY_SALES) * 1000) / 10,
  pendingOrders: MOCK_ORDER_DETAILS.filter((order) => order.status === 'pending').length,
  lowStockCount: MOCK_LOW_STOCK.length,
  newComments: MOCK_COMMENTS.filter((comment) => comment.status === 'pending').length,
};

/**
 * The signed-in user for mock mode, typed as the shared `SessionUser`.
 *
 * `avatarUrl` is `null` on purpose — that is the common case, and it exercises
 * the initials fallback in the topbar's dropdown (BO-B06 tc 9) instead of
 * hiding it behind a working image. `MOCK_CUSTOMERS` is deliberately not
 * reused: those rows are shoppers, and an admin is not one of them.
 */
export const MOCK_SESSION_USER = {
  id: '1',
  fullName: 'مدیر سیستم',
  email: 'admin@digibit.market',
  avatarUrl: null,
} satisfies SessionUser;
