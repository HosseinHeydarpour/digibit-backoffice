// src/app/features/categories/models/category.model.ts
//
// The category tree, as the categories screen reads it (BO-G01).
//
// `children` is always an array — never `null`/`undefined` — so the template and
// the filter can walk it without a guard at every level. The API returns nested
// data (`GET /categories?tree=true`); the flat list the product form uses stays
// a separate endpoint, because a select needs a path, not a tree.

import type { EntityId } from '@shared/models';

/** One node of the category tree. */
export interface CategoryNode {
  readonly id: EntityId;
  /** The parent this node sits under; 
ull at the root (needed by BO-G03). */
  readonly parentId: EntityId | null;
  readonly name: string;
  readonly slug: string;
  /** PrimeIcons class, e.g. `pi pi-pen-to-square`; `null` renders a neutral box. */
  readonly icon: string | null;
  /** Sort key inside one parent; the API already returns the list sorted. */
  readonly order: number;
  readonly isActive: boolean;
  /** Free text the form edits; the tree does not print it (BO-G02). */
  readonly description: string;
  /** How many products sit directly in this category (not in its children). */
  readonly productCount: number;
  readonly children: readonly CategoryNode[];
}

/** The body a create/update sends (BO-G02). Parent selection is BO-G03. */
export interface CategoryInput {
  readonly name: string;
  readonly slug: string;
  readonly icon: string | null;
  readonly order: number;
  readonly isActive: boolean;
  readonly description: string;
  readonly parentId: EntityId | null;
}
