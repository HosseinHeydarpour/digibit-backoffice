/**
 * Deterministic sample products. Deterministic (not random) so a snapshot or a
 * pagination assertion gives the same answer every run.
 * IDs are strings and dates are UTC millis — same contract as the real API.
 */
export interface MockProduct {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  brandId: string;
  price: number;
  stock: number;
  isActive: boolean;
  createdAt: number;
}

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

/**
 * Fixed reference instant for every fixture in this folder (2026-10-15 UTC).
 * Shared rather than redeclared so products, orders and comments all sit on the
 * same timeline — a mismatched clock only shows up much later as a nonsense
 * "created three days after it was ordered" in the UI.
 */
export const FIXTURE_NOW = Date.UTC(2026, 9, 15);
const DAY = 86_400_000;

export const MOCK_PRODUCTS: MockProduct[] = NAMES.map((name, i) => ({
  id: String(i + 1),
  name,
  slug: `product-${i + 1}`,
  categoryId: String((i % 4) + 1),
  brandId: String((i % 5) + 1),
  price: 250_000 + i * 137_000,
  stock: i % 7 === 0 ? 0 : (i + 1) * 3,
  isActive: i % 5 !== 0,
  createdAt: FIXTURE_NOW - i * DAY,
}));
