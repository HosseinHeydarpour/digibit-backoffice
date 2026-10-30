// src/app/features/categories/category-delete/delete-decision.ts
//
// WHAT THIS DECIDES (BO-G04)
// --------------------------
// Deleting a category has three possible shapes, and which one applies is a pure
// function of the node the user clicked — no HTTP, no signals, so the rules are
// tested without a TestBed:
//
//   1. `blocked`  — the node holds products of its own. Deleting it would leave
//                   those products pointing at a category that no longer exists,
//                   so the page refuses before it asks the server (tc 1/2).
//   2. `children` — the node is empty but has sub-categories: the user must
//                   choose between moving them up to the parent and deleting the
//                   whole branch (tc 3/4). `childProducts` is what makes the
//                   dangerous option unavailable: a cascade may not silently
//                   orphan the products sitting in a child (tc 10).
//   3. `simple`   — an empty leaf: one ordinary confirmation.
//
// WHY THE PRODUCTS OF A CHILD DO NOT BLOCK THE WHOLE DELETE
// ---------------------------------------------------------
// The task blocks a delete when the category "has products". A parent whose own
// products are zero but whose child sells five is still safe to delete BY
// TRANSFER: the child keeps its products, only its `parentId` changes. Blocking
// that would forbid a legitimate tidy-up, so the branch count only disables the
// CASCADE radio instead of the dialog.
//
// TRACE — «لوازم جانبی موبایل» (a root, 0 own products, 2 children, one of them
// selling 3 phones) is deleted:
//
//   1. `deleteDecision(node)` → own `productCount` is 0, so not `blocked`.
//   2. It has children, so `{ kind: 'children', childCount: 2, childProducts: 3 }`.
//   3. The dialog opens on «انتقال زیردسته‌ها به سطح اصلی» and the cascade radio
//      is disabled with «زیردسته‌ها محصول دارند».
//   4. Confirming sends `DELETE /categories/<id>?strategy=transfer`; the two
//      children keep their products and become roots.

import type { CategoryNode } from '../models/category.model';

/** What the delete dialog is allowed to offer for one node (BO-G04). */
export type CategoryDeleteDecision =
  /** The node's own products would be orphaned: no delete at all. */
  | { readonly kind: 'blocked'; readonly productCount: number }
  /** An empty leaf: a single confirmation. */
  | { readonly kind: 'simple' }
  /** An empty parent: transfer its children up, or delete the branch. */
  | {
      readonly kind: 'children';
      readonly childCount: number;
      /** Products sitting in the descendants — cascade is refused while non-zero. */
      readonly childProducts: number;
    };

export function deleteDecision(node: CategoryNode): CategoryDeleteDecision {
  if (node.productCount > 0) {
    return { kind: 'blocked', productCount: node.productCount };
  }

  if (node.children.length > 0) {
    return {
      kind: 'children',
      childCount: node.children.length,
      childProducts: node.children.reduce((sum, child) => sum + branchProducts(child), 0),
    };
  }

  return { kind: 'simple' };
}

/** Products in a node and everything under it. */
function branchProducts(node: CategoryNode): number {
  return node.children.reduce((sum, child) => sum + branchProducts(child), node.productCount);
}
