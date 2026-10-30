// src/app/features/categories/category-form/category-validators.ts
//
// The category form's rules (BO-G02), as pure functions so the spec needs no
// TestBed.
//
// The slug regex is the SAME contract the product form enforces: lowercase ASCII
// words joined by single hyphens. Two forms, one URL shape — a slug a router can
// match and a human can read.

import type { AbstractControl, ValidationErrors } from '@angular/forms';

import type { CategoryNode } from '../models/category.model';

export const CATEGORY_NAME_MAX = 80;
export const CATEGORY_SLUG_MAX = 80;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Name: required after trimming, at most 80 characters. */
export function categoryNameValidator(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value.trim() : '';

  if (value === '') {
    return { required: true };
  }

  return value.length > CATEGORY_NAME_MAX
    ? { maxlength: { requiredLength: CATEGORY_NAME_MAX, actualLength: value.length } }
    : null;
}

/** Slug: required, `[a-z0-9-]`, at most 80 characters. */
export function categorySlugValidator(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value.trim() : '';

  if (value === '') {
    return { required: true };
  }

  if (value.length > CATEGORY_SLUG_MAX) {
    return { maxlength: { requiredLength: CATEGORY_SLUG_MAX, actualLength: value.length } };
  }

  return SLUG_PATTERN.test(value) ? null : { pattern: true };
}

/** Order: a positive whole number; the first position is 1, never 0. */
export function categoryOrderValidator(control: AbstractControl): ValidationErrors | null {
  if (control.value === null || control.value === undefined || control.value === '') {
    return { required: true };
  }

  const value = Number(control.value);

  if (!Number.isFinite(value)) {
    return { number: true };
  }

  if (!Number.isInteger(value) || value < 1) {
    return { negative: true };
  }

  return null;
}

/**
 * tc 4: two categories under the same parent may not share a name.
 *
 * TRACE — «لوازم تحریر» already exists at the root and the user types it again:
 *
 *   1. `siblings` are the nodes at the SAME level, so «دفتر و کاغذ» may be called
 *      «لوازم تحریر» without a conflict — different level, different namespace.
 *   2. The comparison trims and collapses spaces (`لوازم  تحریر` matches) and
 *      ignores case, because a Persian user may type either.
 *   3. The edited category itself is skipped (`selfId`), or saving an unchanged
 *      form would report a duplicate of itself.
 */
export function isDuplicateName(
  siblings: readonly CategoryNode[],
  name: string,
  selfId?: string | null,
): boolean {
  const needle = normalize(name);

  if (needle === '') {
    return false;
  }

  return siblings.some((node) => node.id !== selfId && normalize(node.name) === needle);
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fa');
}
