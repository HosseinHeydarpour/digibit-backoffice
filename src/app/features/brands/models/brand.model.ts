// src/app/features/brands/models/brand.model.ts
//
// A brand as the products module reads it (BO-G05).
//
// `productCount` is computed by the API, not by the list page: the row badge has
// to be right on page 3 of a search too, where the products are not loaded. It
// lives on the LIST item; the full `Brand` adds the fields only the form edits.

import type { EntityId } from '@shared/models';

/** One row of `GET /brands`. */
export interface BrandListItem {
  readonly id: EntityId;
  readonly name: string;
  readonly slug: string;
  /** A URL; `null` renders the initial-letter fallback (BO-G06 owns the upload). */
  readonly logo: string | null;
  readonly isActive: boolean;
  /** How many products point at this brand right now. */
  readonly productCount: number;
}

/** `GET /brands/:id` — the list row plus what only the form edits. */
export interface Brand extends BrandListItem {
  readonly description: string;
  /** UTC milliseconds, per ARCHITECTURE.md §5. */
  readonly createdAt: number;
}

/** The body a create/update sends. */
export interface BrandInput {
  readonly name: string;
  readonly slug: string;
  readonly logo: string | null;
  readonly isActive: boolean;
  readonly description: string;
}

/** The query the list page sends; every field is optional. */
export interface BrandQuery {
  readonly query?: string;
  readonly page?: number;
  readonly pageSize?: number;
}
