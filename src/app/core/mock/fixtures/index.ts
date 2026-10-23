import type { SessionUser } from '@shared/models/session.model';

import { FIXTURE_NOW, MOCK_PRODUCTS } from './products.fixture';

export { FIXTURE_NOW, MOCK_PRODUCTS } from './products.fixture';
export type { MockProduct, MockProductStatus } from './products.fixture';
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
const NAMES = [
  'کیف چرم دستدوز',
  'کفش ورزشی مردانه',
  'ساعت هوشمند',
  'هدفون بیسیم',
  'عطر زنانه',
  'کوله پشتی',
  'عینک آفتابی',
  'محافظ صفحه',
  'پاوربانک ۲۰۰۰۰',
  'کیبورد مکانیکی',
  'ماوس گیمینگ',
  'هدست گیمینگ',
  'شارژر سریع ۶۵ وات',
  'کابل تایپسی',
  'اسپیکر بلوتوثی',
  'موس پد',
  'لامپ هوشمند',
  'دوربین تحت شبکه',
  'هارد اکسترنال',
  'فلش مموری ۶۴',
];

/** Generic list generator — enough shape for any table to render. */
function makeList<T extends Record<string, unknown>>(count: number, build: (i: number) => T): T[] {
  return Array.from({ length: count }, (_, i) => build(i));
}

export const MOCK_CATEGORIES = makeList(6, (i) => ({
  id: pad(i + 1),
  parentId: i === 0 ? null : '1',
  name: ['لوازم برقی', 'مد و پوشاک', 'خانه و آشپزخانه', 'ورزشی', 'زیبایی', 'کتاب'][i],
  slug: `category-${i + 1}`,
  order: i + 1,
  isActive: true,
}));

export const MOCK_BRANDS = makeList(5, (i) => ({
  id: pad(i + 1),
  name: ['سامسونگ', 'ال جی', 'اپل', 'شیائومی', 'سونی'][i],
  slug: `brand-${i + 1}`,
  logo: null,
  isActive: true,
}));

export const MOCK_ORDERS = makeList(18, (i) => ({
  id: pad(i + 1),
  code: `ORD-${14000 + i}`,
  customerId: pad((i % 8) + 1),
  customerName: [
    'زهرا محمدی',
    'علی رضایی',
    'مریم حسینی',
    'رضا کریمی',
    'سارا احمدی',
    'محمد نوری',
    'نگار شریفی',
    'امیر صادقی',
  ][i % 8],
  status: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'][i % 6],
  total: 480_000 + i * 92_000,
  itemCount: (i % 4) + 1,
  createdAt: now - i * 3_600_000,
}));

export const MOCK_CUSTOMERS = makeList(8, (i) => ({
  id: pad(i + 1),
  fullName: [
    'زهرا محمدی',
    'علی رضایی',
    'مریم حسینی',
    'رضا کریمی',
    'سارا احمدی',
    'محمد نوری',
    'نگار شریفی',
    'امیر صادقی',
  ][i],
  phone: `0912${String(1000000 + i * 11111)}`,
  email: `user${i + 1}@example.com`,
  isActive: i % 4 !== 0,
  orderCount: (i * 3) % 7,
  createdAt: now - i * 5 * DAY,
}));

export const MOCK_COUPONS = makeList(7, (i) => ({
  id: pad(i + 1),
  code: `OFF${(i + 1) * 10}`,
  type: i % 2 === 0 ? 'percent' : 'amount',
  value: i % 2 === 0 ? (i + 1) * 5 : (i + 1) * 50_000,
  minCart: 500_000,
  maxUses: 100,
  usedCount: i * 7,
  from: now - 10 * DAY,
  to: now + 20 * DAY,
  isActive: i % 3 !== 0,
}));

export const MOCK_SHIPPING_METHODS = makeList(6, (i) => ({
  id: pad(i + 1),
  name: ['پست پیشتاز', 'تیپاکس', 'پیک تهران', 'تحویل حضوری', 'پست سفارشی', 'ارسال رایگان'][i],
  cost: i === 5 ? 0 : 45_000 + i * 15_000,
  freeFrom: i === 5 ? 0 : 1_000_000,
  estimatedDays: i + 1,
  isActive: i % 4 !== 0,
}));

export const MOCK_BANNERS = makeList(8, (i) => ({
  id: pad(i + 1),
  title: `بنر تخفیف شماره ${i + 1}`,
  imageUrl: `/mock/banner-${i + 1}.jpg`,
  link: '/products',
  position: ['home-top', 'home-middle', 'sidebar'][i % 3],
  order: i + 1,
  from: now - 5 * DAY,
  to: now + 15 * DAY,
  isActive: i % 4 !== 0,
}));

export const MOCK_COMMENTS = makeList(5, (i) => ({
  id: pad(i + 1),
  productId: pad((i % 3) + 1),
  productName: NAMES[i % NAMES.length],
  userName: ['کاربر مهمان', 'زهرا م.', 'علی ر.', 'مریم ح.', 'رضا ک.'][i],
  body: 'کیفیت محصول خوب بود و سریع ارسال شد. پیشنهاد میکنم.',
  rating: (i % 5) + 1,
  status: ['pending', 'approved', 'rejected'][i % 3],
  createdAt: now - i * DAY,
}));

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
  orderCount: 342,
  customerCount: 187,
  productCount: MOCK_PRODUCTS.length,
  salesChangePercent: Math.round(((TODAY_SALES - YESTERDAY_SALES) / YESTERDAY_SALES) * 1000) / 10,
  pendingOrders: 23,
  lowStockCount: MOCK_LOW_STOCK.length,
  newComments: 5,
};

export const MOCK_SETTINGS = {
  store: { name: 'دیجیبیت مارکت', phone: '02112345678', email: 'info@digibit.market' },
  payment: { gateway: 'zarinpal', sandbox: true, merchantId: '****4321' },
  sms: { provider: 'kavenegar', sender: '10008663', apiKey: '****9876' },
  seo: { title: 'دیجیبیت مارکت', description: 'فروشگاه اینترنتی', keywords: ['فروشگاه', 'آنلاین'] },
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
