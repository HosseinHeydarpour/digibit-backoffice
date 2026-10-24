/**
 * Production stand-in for `core/mock/fixtures/products-data.ts`.
 *
 * `fileReplacements` in angular.json swaps this file in whenever the production
 * configuration is built. The real file carries ~2 MB of the shop export
 * (including 68 WebP photos as data URLs), and esbuild KEEPS the products
 * fixture chain in the bundle even though nothing in prod reads it — the
 * fixture's top-level `.map()` initialiser reads as a potential side effect, so
 * the declaration survives DCE (measured: `npm run build` shipped the whole
 * export inside `main.js`). Swapping the DATA file out is what actually keeps
 * those bytes out of the shipped bundle; grep the built bundle for `UklGR` (the
 * WebP magic) to verify.
 *
 * Exports the same names as the mock version so `products.fixture.ts` imports
 * one path and never branches on the environment.
 */

/** One sellable variation, exactly as the source JSON stores it. */
export interface RawProductVariant {
  readonly id: string;
  /** Human label of the variation, e.g. «64 گیگ». */
  readonly name: string;
  readonly price: number;
  readonly quantity: number;
}

/** A colour choice, exactly as the source JSON stores it. */
export interface RawProductColor {
  readonly name: string;
  readonly hex: string;
}

/** One catalogue row, exactly as the source JSON stores it. */
export interface RawProduct {
  readonly id: string;
  readonly name: string;
  readonly categoryId: string;
  readonly price: number;
  /** Units on hand — the fixture maps this to the panel's `stock`. */
  readonly quantity: number;
  /** WebP data URL (or '' when the shop has no photo). */
  readonly image: string;
  readonly variants: readonly RawProductVariant[];
  readonly colors: readonly RawProductColor[];
  /** Raw HTML from the shop; most rows carry ''. */
  readonly description: string;
  readonly isSpecialOffer: boolean;
}

/** Production carries no catalogue — the mock layer is dev-only scaffolding. */
export const RAW_PRODUCTS: readonly RawProduct[] = [];
