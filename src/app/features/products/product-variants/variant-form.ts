// src/app/features/products/product-variants/variant-form.ts
//
// The variant editor's data layer (BO-F10).
//
// WHY FACTORIES INSTEAD OF BUILDING GROUPS IN THE COMPONENT
// --------------------------------------------------------
// Three places create a variant row: the editor's «افزودن», its «تکرار», and —
// from BO-F14 — the edit page that hydrates a saved product. If each one wrote
// its own `fb.group({...})`, the three shapes would drift the day a field is
// added, and the payload builder would start reading a control that only two of
// them have.
//
// The factories below are the single definition of a row. They also mean the
// pure spec can assert the shape without a TestBed, which is why `variant-
// form.spec.ts` runs in milliseconds.
//
// WHY THE PAYLOAD BUILDERS LIVE HERE AND NOT IN THE SERVICE
// ---------------------------------------------------------
// `ProductVariantInput` is an API contract; the FORM is a UI contract. Keeping
// the translation next to the form means BO-F13 can call `variantsPayload()` and
// receive exactly what `CreateProductDto.variants` expects, and the F13 reviewer
// does not have to re-discover which control held which property.
//
// WHY `imageUrl` IS `''` AND NOT `null` INSIDE THE FORM
// -----------------------------------------------------
// An `<input>` writes strings. A non-nullable control keeps every read a string,
// and `toVariantInput()` is the one place that turns "no image" into the `null`
// the API expects. Mixing `null` into a text control makes Angular's value
// accessor write the string `"null"` in some browsers.

import { FormArray, FormBuilder } from '@angular/forms';
import type { AbstractControl, FormGroup } from '@angular/forms';

import type { ProductVariantInput } from '../models/product.model';

import {
  atLeastOneVariantValidator,
  attributeKeyValidator,
  attributePairValidator,
  attributeValueValidator,
  variantImageUrlValidator,
  variantPriceValidator,
  variantSkuValidator,
  variantStockValidator,
} from './variant-validators';

/**
 * A hard ceiling, not a business rule from the API.
 *
 * Fifty rows is already more than a human can compare on one screen, and an
 * unbounded `push` lets a stuck key repeat fill the tab with thousands of form
 * groups. The number is exported so the button, the warning and the spec all
 * quote the same value.
 */
export const MAX_VARIANTS = 50;

/**
 * The two attribute keys the catalogue uses most.
 *
 * They are SUGGESTIONS, not a closed list: the model is an open record, and
 * phase 2 will need «جنس» or «ظرفیت». The row offers them as one-click chips so
 * the common case does not require typing a key, then gets out of the way.
 */
export const VARIANT_ATTRIBUTE_SUGGESTIONS: readonly string[] = ['رنگ', 'سایز'];

/** One `{ key, value }` pair in a variant's attribute list. */
export interface VariantAttributePair {
  readonly key: string;
  readonly value: string;
}

/**
 * The values a row can be seeded with.
 *
 * Deliberately a plain object rather than a `ProductVariant`: the edit page has
 * an id and timestamps the form does not want, and a duplication only has the
 * controls' current values.
 */
export interface VariantSeed {
  readonly sku?: string;
  readonly attributes?: Readonly<Record<string, string>>;
  readonly price?: number;
  readonly stock?: number;
  readonly imageUrl?: string | null;
}

/** Everything `createVariantGroup` needs from its caller. */
export interface VariantGroupOptions {
  /** Used only when the seed does not provide a price. */
  readonly basePrice: number;
  readonly seed?: VariantSeed;
}

/**
 * One attribute pair.
 *
 * TRACE: `createAttributeGroup(fb, { key: 'رنگ', value: '' })` creates a group
 * whose pair validator returns `{ valueRequired: true }` until the user types a
 * colour. `createAttributeGroup(fb)` (both empty) is valid, because «+ ویژگی»
 * must not turn the form red on click.
 */
export function createAttributeGroup(
  fb: FormBuilder,
  pair: Partial<VariantAttributePair> = {},
): FormGroup {
  return fb.nonNullable.group(
    {
      key: [pair.key ?? '', attributeKeyValidator],
      value: [pair.value ?? '', attributeValueValidator],
    },
    { validators: attributePairValidator },
  );
}

/**
 * The array the product form stores under `variants`.
 *
 * The min-one validator is attached HERE, not in the component, so every
 * consumer — the create page, the future edit page, a story — enforces tc 6
 * without remembering to wire it.
 */
export function createVariantArray(fb: FormBuilder): FormArray<FormGroup> {
  return fb.array<FormGroup>([], atLeastOneVariantValidator);
}

/**
 * One variant row.
 *
 * `price` falls back to the product's base price (tc 4); `stock` starts at zero,
 * which is a legitimate value rather than an empty input (tc 5). A seed always
 * wins: BO-F14 must be able to restore a saved price even when the base price has
 * changed since.
 *
 * TRACE: base price 2,100,000 and no seed produces
 * `{ sku: '', attributes: [], price: 2100000, stock: 0, imageUrl: '' }`.
 */
export function createVariantGroup(fb: FormBuilder, options: VariantGroupOptions): FormGroup {
  const seed = options.seed;
  const attributes = Object.entries(seed?.attributes ?? {}).map(([key, value]) =>
    createAttributeGroup(fb, { key, value }),
  );

  return fb.nonNullable.group({
    sku: [seed?.sku ?? '', variantSkuValidator],
    attributes: fb.array<FormGroup>(attributes),
    price: [seed?.price ?? options.basePrice, variantPriceValidator],
    stock: [seed?.stock ?? 0, variantStockValidator],
    imageUrl: [seed?.imageUrl ?? '', variantImageUrlValidator],
  });
}

/**
 * The row's attribute array, or `null` for a group that was not built by this
 * file.
 *
 * Returning `null` instead of throwing keeps a corrupted row from taking the
 * whole page down; the row component falls back to an empty array.
 */
export function attributeGroupsOf(group: AbstractControl): FormArray<FormGroup> | null {
  const attributes = group.get('attributes');

  return attributes instanceof FormArray ? (attributes as FormArray<FormGroup>) : null;
}

/**
 * The attribute pairs as the API record.
 *
 * Empty and half-written pairs are skipped: a placeholder row is UI, not data.
 * The first occurrence of a key wins, which matches what the duplicate-key
 * marker prevents; the rule exists so a payload can never contain two values for
 * one key even if a caller bypasses the editor.
 */
export function variantAttributes(group: AbstractControl): Readonly<Record<string, string>> {
  const attributes = attributeGroupsOf(group);

  if (!attributes) {
    return {};
  }

  const record: Record<string, string> = {};

  for (const pair of attributes.controls) {
    const key = text(pair.get('key')?.value);
    const value = text(pair.get('value')?.value);

    if (key === '' || value === '' || Object.prototype.hasOwnProperty.call(record, key)) {
      continue;
    }

    record[key] = value;
  }

  return record;
}

/**
 * One row -> the shape `CreateProductDto.variants` accepts.
 *
 * TRACE — a real row, from typed values to payload:
 *
 *   input:
 *     sku: '  SONY-WH1000-BLK  '
 *     attributes: [{ key: 'رنگ ', value: ' مشکی ' }, { key: 'سایز', value: '' }]
 *     price: 2100000, stock: 12, imageUrl: ''
 *
 *   1. text(sku) trims the value -> 'SONY-WH1000-BLK'.
 *   2. variantAttributes() drops the half-written «سایز» pair, trims the first
 *      pair, and returns { رنگ: 'مشکی' }.
 *   3. Number(price) and Number(stock) are finite, so they stay 2100000 and 12.
 *   4. text(imageUrl) is '', so the payload gets null instead of an empty string.
 *
 *   output:
 *     {
 *       sku: 'SONY-WH1000-BLK',
 *       attributes: { رنگ: 'مشکی' },
 *       price: 2100000,
 *       stock: 12,
 *       imageUrl: null,
 *     }
 *
 * Numbers are coerced here because a cleared `<input type="number">` reports
 * `null`, while `ProductVariantInput` promises numbers. `0` is the honest
 * fallback: the form is invalid in that state, so the payload is never sent.
 */
export function toVariantInput(group: AbstractControl): ProductVariantInput {
  const price = Number(group.get('price')?.value);
  const stock = Number(group.get('stock')?.value);
  const imageUrl = text(group.get('imageUrl')?.value);

  return {
    sku: text(group.get('sku')?.value),
    attributes: variantAttributes(group),
    price: Number.isFinite(price) ? price : 0,
    stock: Number.isFinite(stock) ? stock : 0,
    imageUrl: imageUrl === '' ? null : imageUrl,
  };
}

/** Every row in payload order (BO-F13 consumes this). */
export function variantsPayload(variants: FormArray): readonly ProductVariantInput[] {
  return variants.controls.map((group) => toVariantInput(group));
}

/**
 * Total stock across the rows.
 *
 * Invalid and negative values are ignored rather than summed: a half-typed
 * `-` or an empty row must not make the summary jump to a random number. BO-F12
 * owns the authoritative total; this is the live preview in the editor header.
 */
export function sumVariantStock(variants: FormArray): number {
  let total = 0;

  for (const group of variants.controls) {
    const value = Number(group.get('stock')?.value);

    if (Number.isFinite(value) && value > 0) {
      total += value;
    }
  }

  return total;
}

/**
 * The next free SKU for a duplicated row.
 *
 * TRACE: `nextAvailableSku('SONY-100', ['SONY-100', 'SONY-100-2'])` → `SONY-100-3`.
 * An empty source stays empty: inventing `-2` for a row the user has not named
 * yet would hide the required-SKU error behind a plausible-looking string.
 */
export function nextAvailableSku(base: string, taken: readonly string[]): string {
  const root = base.trim();

  if (root === '') {
    return '';
  }

  const used = new Set(taken.map((sku) => sku.trim().toLowerCase()));

  if (!used.has(root.toLowerCase())) {
    return root;
  }

  let counter = 2;

  while (used.has(`${root}-${counter}`.toLowerCase())) {
    counter += 1;
  }

  return `${root}-${counter}`;
}

/**
 * Copy a row for «تکرار».
 *
 * The SKU is regenerated because a byte-for-byte copy would be an instant
 * duplicate (tc 3). Attributes, price, stock and image are copied: those are the
 * values a user duplicates a row FOR.
 */
export function duplicateVariantGroup(
  fb: FormBuilder,
  source: AbstractControl,
  taken: readonly string[],
): FormGroup {
  const price = Number(source.get('price')?.value);
  const stock = Number(source.get('stock')?.value);

  return createVariantGroup(fb, {
    basePrice: Number.isFinite(price) ? price : 0,
    seed: {
      sku: nextAvailableSku(text(source.get('sku')?.value), taken),
      attributes: variantAttributes(source),
      price: Number.isFinite(price) ? price : 0,
      stock: Number.isFinite(stock) ? stock : 0,
      imageUrl: text(source.get('imageUrl')?.value),
    },
  });
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
