// src/app/features/categories/category-tree/category-filter.ts
//
// Search over the category tree (BO-G01 tc 6).
//
// TRACE — the tree is
//
//   لوازم تحریر            (children: دفتر و کاغذ, خودکار)
//   لوازم جانبی موبایل     (children: گوشی سامسونگ)
//
// and the user types «گوشی»:
//
//   1. `matches('لوازم جانبی موبایل')` = false, but its child matches.
//   2. A node is kept when IT matches OR any descendant does, and a matching
//      node keeps ALL of its children.
//   3. Result: «لوازم جانبی موبایل» with only «گوشی سامسونگ» under it. The first
//      branch is dropped entirely, so the tree never shows an empty parent.
//
// Searching «لوازم تحریر» (a PARENT) keeps both of its children: the user asked
// for that branch, and hiding its contents would answer a different question.

import type { CategoryNode } from '../models/category.model';

/** Case- and space-insensitive match over the name and the slug. */
function matches(node: CategoryNode, needle: string): boolean {
  return (
    node.name.toLocaleLowerCase('fa').includes(needle) ||
    node.slug.toLocaleLowerCase('fa').includes(needle)
  );
}

/** The tree reduced to the branches that answer `query`; the same tree for `''`. */
export function filterTree(nodes: readonly CategoryNode[], query: string): readonly CategoryNode[] {
  const needle = query.trim().toLocaleLowerCase('fa');

  if (needle === '') {
    return nodes;
  }

  const keep = (node: CategoryNode): CategoryNode | null => {
    if (matches(node, needle)) {
      return node;
    }

    const children = node.children
      .map(keep)
      .filter((child): child is CategoryNode => child !== null);

    return children.length === 0 ? null : { ...node, children };
  };

  return nodes.map(keep).filter((node): node is CategoryNode => node !== null);
}
