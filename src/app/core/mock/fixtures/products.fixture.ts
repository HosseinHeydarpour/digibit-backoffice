/**
 * The product catalogue, built from the shop's real export
 * (`RAW_PRODUCTS` in `products-data.ts` — names, categories, prices, stock,
 * photos and variants are the source's own data).
 *
 * What the source does not carry is generated here, deterministically, so a
 * snapshot or a pagination assertion gives the same answer every run:
 * `sku`, `slug`, `brandId`, `status` and `createdAt`.
 *
 * IDs are strings and dates are UTC millis — same contract as the real API.
 *
 * BO-F05 replaced the old `isActive` boolean with the panel's three-state
 * `status`. Keeping both would have created two answers to one question — the
 * exact class of bug the dashboard fixtures already paid for — so `isActive` was
 * removed rather than left beside the new field.
 */
import { RAW_PRODUCTS } from './products-data';

export type MockProductStatus = 'published' | 'draft' | 'inactive';

export interface MockProductColor {
  readonly name: string;
  readonly hex: string;
}

export interface MockProductVariant {
  readonly id: string;
  /** Human label of the variation, e.g. «64 گیگ». */
  readonly name: string;
  readonly price: number;
  readonly quantity: number;
}

export interface MockProduct {
  id: string;
  name: string;
  /** Stable, human-readable SKU; BO-F03 searches it alongside the name. */
  sku: string;
  slug: string;
  categoryId: string;
  /** Brands are derived from the name; an unbranded row carries `null`. */
  brandId: string | null;
  price: number;
  stock: number;
  /**
   * Warning line for the list's «کم‌موجودی» badge (BO-F12).
   *
   * The export carries no such column, so every product shares one mock value —
   * the real API stores it per product and returns it in the same row.
   */
  lowStockThreshold: number;
  status: MockProductStatus;
  createdAt: number;
  /** The shop's real photo as a data URL, or '' when it has none. */
  image: string;
  colors: readonly MockProductColor[];
  variants: readonly MockProductVariant[];
  description: string;
  isSpecialOffer: boolean;
}

/**
 * Fixed reference instant for every fixture in this folder (2026-10-15 UTC).
 * Shared rather than redeclared so products, orders and comments all sit on the
 * same timeline — a mismatched clock only shows up much later as a nonsense
 * "created three days after it was ordered" in the UI.
 */
export const FIXTURE_NOW = Date.UTC(2026, 9, 15);
const DAY = 86_400_000;

/**
 * Brands read out of the product names, in priority order — the first pattern
 * that matches wins. These are the brands the shop actually sells, so the brand
 * filter answers with real groupings instead of five cycled placeholders.
 *
 * The shop's export carries no brand column: a row whose name names no brand
 * stays `null` («—» in the table), which is the honest answer for goods like
 * «طلق و شیرازه».
 */
const BRANDS: readonly { id: string; name: string; pattern: RegExp }[] = [
  { id: '1', name: 'سندیسک', pattern: /سندیسک|sandisk/i },
  { id: '2', name: 'وریتی', pattern: /وریتی|verity/i },
  { id: '3', name: 'گلکسبیت', pattern: /گلکسبیت|گلکسی\s*بیت|galexbit/i },
  { id: '4', name: 'پاناتک', pattern: /پاناتک|panatech/i },
  { id: '5', name: 'وینر', pattern: /وینر/ },
  { id: '6', name: 'سامسونگ', pattern: /سامسونگ|samsung/i },
  { id: '7', name: 'نوکیا', pattern: /نوکیا|nokia/i },
  { id: '8', name: 'ایکس‌پی پروداکت', pattern: /پروداکت|xp\s*product/i },
];

export const MOCK_BRANDS = BRANDS.map(({ id, name }) => ({
  id,
  name,
  slug: `brand-${id}`,
  logo: null,
  isActive: true,
}));

function brandIdFor(name: string): string | null {
  return BRANDS.find((brand) => brand.pattern.test(name))?.id ?? null;
}

/**
 * A status spread that reaches all three pills in the list.
 *
 * `i % 5 === 0` gives the inactive rows; `i % 7 === 0` adds the drafts (the
 * first branch wins, so the rules compose without a product ever being both).
 * The source export has no lifecycle column, and a catalogue where every row is
 * published would leave two status filters permanently empty in mock mode.
 */
function statusFor(index: number): MockProductStatus {
  if (index % 5 === 0) return 'inactive';
  if (index % 7 === 0) return 'draft';
  return 'published';
}

/**
 * The catalogue. `stock` is the source's `quantity`; everything the source
 * carries is passed through untouched and everything it lacks is generated.
 */
export const MOCK_PRODUCTS: MockProduct[] = RAW_PRODUCTS.map((product, i) => ({
  id: product.id,
  name: product.name,
  sku: `SKU-${1001 + i}`,
  slug: `product-${product.id}`,
  categoryId: product.categoryId,
  brandId: brandIdFor(product.name),
  price: product.price,
  stock: product.quantity,
  // Mock data, not the dashboard's widget default: a real product carries its
  // own threshold, and the list badge (BO-F12) reads this same number.
  lowStockThreshold: 5,
  status: statusFor(i),
  createdAt: FIXTURE_NOW - i * DAY,
  image: product.image,
  colors: product.colors,
  variants: product.variants,
  description: product.description,
  isSpecialOffer: product.isSpecialOffer,
}));
