// src/app/features/categories/category-delete/delete-decision.ts
//
// WHAT THIS DECIDES (BO-G04)
// --------------------------
// Deleting a category is a pure function of the node the user clicked — no HTTP,
// no signals, so the rules are tested without a TestBed:
//
//   1. `protected` — the shop's default bucket («بدون دسته‌بندی»). Products that
//      lose their category land there, so removing it would leave them nowhere to
//      go: the row has no trash button and the server refuses even if a stale
//      dialog asks.
//   2. `children`  — the node has sub-categories: the user chooses between moving
//      them up a level and deleting the whole branch.
//   3. `simple`    — an empty leaf: one ordinary confirmation.
//
// PRODUCTS NEVER BLOCK A DELETE
// -----------------------------
// A node (or branch) that holds products still deletes: the server moves them to
// the default category, and `productCount` is what the dialog prints so the move
// is never a surprise. Refusing outright — the first version of this task — left
// the user with a dead-end dialog and no way to tidy the catalogue, while
// WooCommerce and every other admin they know just re-buckets the products.
//
// TRACE — «لوازم تحریر» (27 products, 2 children) is deleted with transfer:
//
//   1. `isDefault` is false, so not `protected`.
//   2. It has children → `{ kind: 'children', childCount: 2, productCount: 27 }`.
//   3. The dialog asks about the children and prints «۲۷ محصول … به «بدون دسته‌بندی»
//      منتقل می‌شوند» above the choice.
//   4. Confirming sends `DELETE /categories/<id>?strategy=transfer`; the server
//      re-buckets the 27 products and moves the two children up one level.

import type { CategoryNode } from '../models/category.model';

/** What the delete dialog may offer for one node (BO-G04). */
export type CategoryDeleteDecision =
  /** The default category: no delete, no choice. */
  | { readonly kind: 'protected' }
  /** An empty leaf. `productCount` is the whole branch, not just this node. */
  | { readonly kind: 'simple'; readonly productCount: number }
  /** A parent: move the children up, or delete the branch with them. */
  | {
      readonly kind: 'children';
      readonly childCount: number;
      /** Products that would be re-bucketed; the dialog prints this number. */
      readonly productCount: number;
    };

export function deleteDecision(node: CategoryNode): CategoryDeleteDecision {
  if (node.isDefault === true) {
    return { kind: 'protected' };
  }

  const productCount = branchProducts(node);

  if (node.children.length > 0) {
    return { kind: 'children', childCount: node.children.length, productCount };
  }

  return { kind: 'simple', productCount };
}

/** Products in a node and everything under it. */
function branchProducts(node: CategoryNode): number {
  return node.children.reduce((sum, child) => sum + branchProducts(child), node.productCount);
}
