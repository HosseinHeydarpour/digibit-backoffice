// src/app/features/products/product-create/product-payload.ts
//
// The form → `POST /products` translation (BO-F13).
//
// WHY THIS IS A FILE AND NOT FOUR LINES INSIDE `save()`
// ----------------------------------------------------
// The payload has three jobs a template cannot show: trim text the user typed,
// turn «no brand» into `null`, and drop gallery rows whose URL only exists in
// this tab. A pure function can be asserted without a TestBed, and `save()`
// stays a sequence of steps (validate → send → route) instead of a builder.
//
// TRACE — the «هدفون سونی» form just before saving:
//
//   control              typed value
//   name                 '  هدفون سونی  '
//   slug                 'hdfon-sony'
//   sku                  'SONY-WH1000-BLK'
//   categoryId           '3'
//   brandId              ''            ← the «بدون برند» sentinel
//   price                2100000
//   stock                10            ← written by syncInventory (BO-F12)
//   lowStockThreshold    5
//   variants             [{ sku: 'SONY-BLK', stock: 4, … }]
//   images               [{ url: 'blob:http://localhost/…' }]
//
//   toCreateProductDto(form) →
//     { name: 'هدفون سونی',            ← trimmed
//       slug: 'hdfon-sony',
//       sku: 'SONY-WH1000-BLK',
//       categoryId: '3',
//       brandId: null,                  ← the empty sentinel becomes null
//       price: 2100000,
//       stock: 10,
//       lowStockThreshold: 5,
//       status: 'draft',
//       variants: [{ sku: 'SONY-BLK', attributes: {}, price: 2100000, stock: 4, imageUrl: null }],
//       images: [] }                    ← the blob: row is dropped, see below
//
// WHY `blob:` IMAGES ARE DROPPED
// ------------------------------
// The gallery keeps new files as `blob:` object URLs (BO-F11). Those strings are
// valid only inside the tab that created them: sending one would store a dead
// link. The bytes travel through `imageFiles()` to the upload endpoint (a
// separate step), so the DTO carries only URLs that already resolve. A row whose
// URL is real is kept, which is what BO-F14's edit form will re-send.

import type { FormGroup } from '@angular/forms';
import { FormArray } from '@angular/forms';

import type { CreateProductDto, ProductStatus } from '../models/product.model';
import { imagesPayload } from '../product-gallery/gallery-form';
import { variantsPayload } from '../product-variants/variant-form';

/** What `form.getRawValue()` returns; the page owns exactly these controls. */
interface ProductFormValue {
  readonly name: string;
  readonly slug: string;
  readonly sku: string;
  readonly categoryId: string;
  readonly brandId: string;
  readonly shortDescription: string;
  readonly description: string;
  readonly price: number;
  readonly stock: number;
  readonly lowStockThreshold: number;
  readonly status: ProductStatus;
}

/** Trim a value that may arrive as `null` from a cleared input. */
function text(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** A cleared number input reports `null`; the DTO promises a number. */
function number(value: number | null | undefined): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * One form → the body `POST /products` accepts.
 *
 * `getRawValue()` rather than `value`: a disabled control is absent from `value`,
 * and a control disabled by a later task would silently drop a field from the
 * payload instead of failing loudly.
 */
export function toCreateProductDto(form: FormGroup): CreateProductDto {
  const value = form.getRawValue() as ProductFormValue;
  const variants = form.controls['variants'];
  const images = form.controls['images'];

  return {
    name: text(value.name),
    slug: text(value.slug),
    sku: text(value.sku),
    categoryId: value.categoryId,
    // '' is the «بدون برند» option; the API's "no brand" is null.
    brandId: text(value.brandId) === '' ? null : text(value.brandId),
    shortDescription: text(value.shortDescription),
    description: text(value.description),
    price: number(value.price),
    stock: number(value.stock),
    lowStockThreshold: number(value.lowStockThreshold),
    status: value.status,
    variants: variants instanceof FormArray ? variantsPayload(variants) : [],
    images:
      images instanceof FormArray
        ? imagesPayload(images).filter((image) => !image.url.startsWith('blob:'))
        : [],
  };
}
