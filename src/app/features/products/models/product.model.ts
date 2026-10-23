// src/app/features/products/models/product.model.ts
//
// TYPES ONLY.
//
// Same cross-chunk rule as the dashboard's models: a runtime value exported from
// a `features/*/models/` file can read back as `undefined` when the module is
// reachable from two chunks. So the COLUMNS array, the status table and the
// fixtures live NEXT TO THEIR COMPONENT (or in the service), not here — this
// file holds only what the compiler erases.
//
// BO-F05 owns the full product contract: the list row, the detail record, the
// variants, the gallery and the query DTO that BO-F03/F04 serialise into the URL.

import type { EntityId, SortOrder } from '@shared/models';

/** Lifecycle of a product. Mirrors the add-product form's وضعیت + the F06 toggle. */
export type ProductStatus = 'published' | 'draft' | 'inactive';

/**
 * The three columns the API is allowed to sort by.
 *
 * A closed union rather than `string`: `buildQuery` writes this value straight
 * into the query string, and a typo would reach the server as an unknown sort
 * instead of failing at compile time.
 */
export type ProductSortField = 'name' | 'price' | 'stock' | 'createdAt';

/**
 * One image in the product gallery (BO-F11).
 *
 * `order` is stored on the server rather than inferred from the array index, so
 * a reorder is one PATCH and two clients agree on what the cover is.
 */
export interface ProductImage {
  readonly id: EntityId;
  readonly url: string;
  readonly alt: string;
  readonly isPrimary: boolean;
  readonly order: number;
}

/**
 * One sellable variation of a product (BO-F10).
 *
 * `attributes` is an open map (`{ رنگ: 'مشکی', سایز: 'L' }`) because phase 1
 * lets the admin define the keys; a closed `{ color, size }` shape would have to
 * be migrated as soon as a third key is needed.
 */
export interface ProductVariant {
  readonly id: EntityId;
  readonly sku: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly price: number;
  readonly stock: number;
  readonly imageUrl: string | null;
}

/**
 * The full product record, as `GET /products/:id` returns it (BO-F05, used by
 * BO-F14's edit resolver).
 *
 * `categoryName`/`brandName` are flattened next to their ids: the edit form needs
 * the label without a second request, and the list already speaks that shape.
 */
export interface Product {
  readonly id: EntityId;
  readonly name: string;
  readonly slug: string;
  readonly sku: string;
  readonly categoryId: EntityId;
  readonly categoryName: string;
  readonly brandId: EntityId | null;
  readonly brandName: string | null;
  readonly shortDescription: string;
  readonly description: string;
  /** Price in TOMAN (the smallest unit the panel prints, formatted by `toman`). */
  readonly price: number;
  /** Total stock across variants; the API owns the sum (BO-F12). */
  readonly stock: number;
  readonly lowStockThreshold: number;
  readonly status: ProductStatus;
  readonly images: readonly ProductImage[];
  readonly variants: readonly ProductVariant[];
  /** Epoch ms — the table formats it through `persianDate`. */
  readonly createdAt: number;
  readonly updatedAt?: number;
}

/**
 * One row of the products list (BO-F02, filled by BO-F05's paged endpoint).
 *
 * Deliberately narrower than `Product`: the table never needs the description,
 * the gallery or the variant array, and downloading them for 20 rows would make
 * the list heavier than the edit page. `sku` is optional because the F02 table
 * does not render it, while BO-F03 lets the user search by it.
 */
export interface ProductListItem {
  readonly id: EntityId;
  readonly name: string;
  readonly sku?: string;
  readonly categoryName: string;
  readonly brandName: string;
  /** Price in TOMAN (the smallest unit the table prints, formatted by `toman`). */
  readonly price: number;
  readonly stock: number;
  readonly status: ProductStatus;
  /** Epoch ms — the table formats it through `persianDate`. */
  readonly createdAt: number;
}

/** A category choice for the list filter (BO-F03) and the product form (BO-F09). */
export interface ProductCategoryOption {
  readonly id: EntityId;
  readonly name: string;
  /** Parent category, used to render the full path in the product form (BO-F09). */
  readonly parentId?: EntityId | null;
  readonly isActive?: boolean;
}

/** A brand choice for the list filter (BO-F03) and the product form (BO-F09). */
export interface ProductBrandOption {
  readonly id: EntityId;
  readonly name: string;
  readonly logo?: string | null;
  readonly isActive?: boolean;
}

/**
 * The filter + paging state BO-F03/F04 keep in the URL and hand to `list()`.
 *
 * Every field is optional: a missing field means "no filter", and `buildQuery`
 * drops null/undefined/empty instead of sending `?status=` to the server.
 */
export interface ProductQuery {
  /** Free text over name, slug and SKU. */
  readonly query?: string;
  readonly categoryId?: EntityId | null;
  readonly brandId?: EntityId | null;
  readonly status?: ProductStatus | null;
  readonly page?: number;
  readonly pageSize?: number;
  readonly sort?: ProductSortField;
  readonly dir?: SortOrder;
}

/** One gallery image in a create/update payload (BO-F11). */
export interface ProductImageInput {
  readonly url: string;
  readonly alt: string;
  readonly isPrimary?: boolean;
  readonly order?: number;
}

/** One variant in a create/update payload (BO-F10). */
export interface ProductVariantInput {
  readonly sku: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly price: number;
  readonly stock: number;
  readonly imageUrl?: string | null;
}

/**
 * The payload `POST /products` accepts (BO-F13).
 *
 * `id`, `createdAt` and `updatedAt` are server-owned and deliberately absent:
 * sending them would let a client choose its own identity and clock.
 */
export interface CreateProductDto {
  readonly name: string;
  readonly slug: string;
  readonly sku: string;
  readonly categoryId: EntityId;
  readonly brandId: EntityId | null;
  readonly shortDescription: string;
  readonly description: string;
  readonly price: number;
  readonly stock: number;
  readonly lowStockThreshold: number;
  readonly status: ProductStatus;
  readonly variants?: readonly ProductVariantInput[];
  readonly images?: readonly ProductImageInput[];
}

/** `PUT /products/:id` accepts the same fields, all optional (BO-F14). */
export type UpdateProductDto = Partial<CreateProductDto>;

/**
 * A column descriptor: the header cell plus the layout/sort metadata the table
 * needs. Declared as data (not hard-coded in the template) so BO-F04 can turn a
 * header click into a sort without touching a single `<th>`.
 */
export interface ProductColumn {
  readonly field:
    'name' | 'categoryName' | 'brandName' | 'price' | 'stock' | 'status' | 'createdAt' | 'actions';
  readonly header: string;
  /** Tailwind layout classes for the `<th>`/`<td>` (responsive hiding, alignment). */
  readonly class?: string;
  /** Column width for `<th style="width:…">`. Optional — content-sized by default. */
  readonly width?: string;
  /** Declared by F02, wired by BO-F04 (sort header click). */
  readonly sortable?: boolean;
}
