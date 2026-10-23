/**
 * Deterministic sample products. Deterministic (not random) so a snapshot or a
 * pagination assertion gives the same answer every run.
 * IDs are strings and dates are UTC millis — same contract as the real API.
 *
 * BO-F05 replaced the old `isActive` boolean with the panel's three-state
 * `status`. Keeping both would have created two answers to one question — the
 * exact class of bug the dashboard fixtures already paid for — so `isActive` was
 * removed rather than left beside the new field.
 */
export type MockProductStatus = 'published' | 'draft' | 'inactive';

export interface MockProduct {
  id: string;
  name: string;
  /** Stable, human-readable SKU; BO-F03 searches it alongside the name. */
  sku: string;
  slug: string;
  categoryId: string;
  brandId: string;
  price: number;
  stock: number;
  status: MockProductStatus;
  createdAt: number;
}

const NAMES = [
  'کیف چرم دست‌دوز',
  'کفش ورزشی مردانه',
  'ساعت هوشمند',
  'هدفون بی‌سیم',
  'عطر زنانه',
  'کوله پشتی',
  'عینک آفتابی',
  'محافظ صفحه',
  'پاوربانک ۲۰۰۰۰',
  'کیبورد مکانیکی',
  'ماوس گیمینگ',
  'هدست گیمینگ',
  'شارژر سریع ۶۵ وات',
  'کابل تایپ‌سی',
  'اسپیکر بلوتوثی',
  'موس پد',
  'لامپ هوشمند',
  'دوربین تحت شبکه',
  'هارد اکسترنال',
  'فلش مموری ۶۴',
];

/**
 * Fixed reference instant for every fixture in this folder (2026-10-15 UTC).
 * Shared rather than redeclared so products, orders and comments all sit on the
 * same timeline — a mismatched clock only shows up much later as a nonsense
 * "created three days after it was ordered" in the UI.
 */
export const FIXTURE_NOW = Date.UTC(2026, 9, 15);
const DAY = 86_400_000;

/**
 * Stock levels, cycled across the catalogue.
 *
 * A deliberate spread rather than `(i + 1) * 3`: the old formula produced
 * multiples of three only, so with a low-stock threshold of 5 the dashboard's
 * «کالاهای کم‌موجودی» card could only ever show «ناموجود» rows and the yellow
 * "almost out" badge (BO-E05 tc 3) was unreachable in mock mode. This pattern
 * gives seven products at or below 5 — which is exactly the
 * `lowStockCount` the summary reports — and healthy shelves everywhere else.
 */
const STOCK_LEVELS = [0, 12, 9, 3, 24, 7, 18, 1, 15, 5, 30, 11];

/**
 * A status spread that reaches all three pills in the list.
 *
 * `i % 5 === 0` gives the inactive rows (0, 5, 10, 15); `i % 7 === 0` adds the
 * drafts (7, 14, because 0 is already inactive). The first branch wins, so the
 * rules compose without a product ever being both.
 */
function statusFor(index: number): MockProductStatus {
  if (index % 5 === 0) return 'inactive';
  if (index % 7 === 0) return 'draft';
  return 'published';
}

export const MOCK_PRODUCTS: MockProduct[] = NAMES.map((name, i) => ({
  id: String(i + 1),
  name,
  sku: `SKU-${1001 + i}`,
  slug: `product-${i + 1}`,
  categoryId: String((i % 4) + 1),
  brandId: String((i % 5) + 1),
  price: 250_000 + i * 137_000,
  stock: STOCK_LEVELS[i % STOCK_LEVELS.length],
  status: statusFor(i),
  createdAt: FIXTURE_NOW - i * DAY,
}));
