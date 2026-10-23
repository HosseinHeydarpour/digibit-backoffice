// src/app/features/products/product-create/category-options.ts
//
// Turns the flat category lookup into the options the form's select shows
// (BO-F09). The API returns `{ id, name, parentId }`; a select cannot show a
// tree, so each option carries a precomputed `path` ("لوازم برقی / صوتی") and a
// `level` the item template turns into indentation.
//
// Why a pure function:
// - the path walk is the tricky part (a missing/deactivated parent, a cycle);
// - the same options are needed by BO-F14's edit page, which should not rebuild
//   the walk in a component;
// - a test can pin the exact strings without rendering a PrimeNG select.

import type { ProductCategoryOption } from '../models/product.model';

export interface CategoryOption extends ProductCategoryOption {
  /** Full readable path from the root, e.g. `لوازم برقی / صوتی`. */
  readonly path: string;
  /** 0 for a root, 1 for a child, … — used only for visual indentation. */
  readonly level: number;
}

/**
 * Build selectable category options from the flat lookup.
 *
 * TRACE: input
 *   [{ id: '1', name: 'لوازم برقی', parentId: null },
 *    { id: '2', name: 'صوتی', parentId: '1' }]
 * → [{ id: '1', path: 'لوازم برقی', level: 0 },
 *    { id: '2', path: 'لوازم برقی / صوتی', level: 1 }]
 *
 * Inactive rows are dropped here as well as in `ProductsService.categories()`;
 * the extra filter is cheap and keeps the rule true for any caller. If a parent
 * is missing (deleted), the child becomes its own root instead of throwing or
 * rendering `undefined / name`.
 */
export function buildCategoryOptions(
  categories: readonly ProductCategoryOption[],
): readonly CategoryOption[] {
  const active = categories.filter((category) => category.isActive !== false);
  const byId = new Map(active.map((category) => [category.id, category]));

  return active
    .map((category) => {
      const names: string[] = [];
      let current: ProductCategoryOption | undefined = category;
      let guard = 0;

      // `guard` makes a corrupt parent cycle terminate instead of hanging the
      // page; 20 is deeper than any real category tree in phase 1.
      while (current && guard < 20) {
        names.unshift(current.name);
        current = current.parentId ? byId.get(current.parentId) : undefined;
        guard += 1;
      }

      return {
        ...category,
        path: names.join(' / '),
        level: names.length - 1,
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path, 'fa'));
}
