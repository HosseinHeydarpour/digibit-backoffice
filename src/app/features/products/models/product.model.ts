// src/app/features/products/models/product.model.ts
//
// TYPES ONLY.
//
// Same cross-chunk rule as the dashboard's models: a runtime value exported from
// a `features/*/models/` file can read back as `undefined` when the module is
// reachable from two chunks. So the COLUMNS array, the status table and the
// fixtures live NEXT TO THEIR COMPONENT (or in the service), not here — this
// file holds only what the compiler erases.

/** Lifecycle of a product. Mirrors the add-product form's وضعیت + the F06 toggle. */
export type ProductStatus = 'published' | 'draft' | 'inactive';

/**
 * One row of the products list (BO-F02). The full `Product`/`ProductVariant`
 * with form + CRUD shapes arrive in BO-F05; the list only needs the columns the
 * table renders. `categoryName`/`brandName` are flattened strings here — the
 * list never nests into `category`/`brand` objects.
 */
export interface ProductListItem {
  readonly id: string;
  readonly name: string;
  readonly categoryName: string;
  readonly brandName: string;
  /** Price in TOMAN (the smallest unit the table prints, formatted by `toman`). */
  readonly price: number;
  readonly stock: number;
  readonly status: ProductStatus;
  /** Epoch ms — the table formats it through `persianDate`. */
  readonly createdAt: number;
}

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
