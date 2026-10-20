// src/app/features/products/products.routes.ts
//
// The products module's routes, owned by the module — the same `loadChildren`
// contract BO-E01 established for the dashboard. Mounting them lazily keeps the
// products pages (and, later, the products service and models) out of the main
// bundle: a visitor who never opens «محصولات» never downloads them (tc 1, tc 8).
//
// `app.routes.ts` no longer carries this module's `data`; it only points here.
// That keeps each page's `title`/`breadcrumb`/`permission` next to the page it
// names, so adding a page is one edit to one file instead of an edit to a shared
// table that has drifted from the code (see `dashboard.routes.ts` for the full
// rationale).
//
// PERMISSION NOTE (tc 3, tc 8)
// -----------------------------
// Every route declares `data.permission: 'products.view'` — the SAME constant
// the sidebar menu uses. This is declarative today: the route guard that gates
// the lazy chunk on it is BO-D07 and does not exist yet, so a user without the
// permission can still reach these pages until that lands. The field is here so
// the future guard has a single, already-wired constant to read, and so nobody
// re-invents the string.
//
// The pages are PLACEHOLDERS — BO-F01 is routes only. Each already renders the
// Arino page shell (`app-page-header` + a card), so the navigation chain works
// end to end; the real content is filled in by BO-F02 (list), BO-F07 (create),
// BO-F10+ (variants), etc.

import { Routes } from '@angular/router';

import { ProductCreate } from './product-create/product-create';
import { ProductDetail } from './product-detail/product-detail';
import { ProductEdit } from './product-edit/product-edit';
import { ProductList } from './product-list/product-list';

/**
 * TRACE — how one URL becomes one page. Input: `/products/42/edit`.
 *
 *   1. `app.routes.ts` matches the `products` node, whose `loadChildren`
 *      resolves and pulls `PRODUCTS_ROUTES` in as the chunk named
 *      `products-routes` (tc 1) — the user downloads it only now.
 *   2. Inside it, `''` needs an empty remainder (does not match `/42/edit`),
 *      `new` is a literal (does not match), so the router reaches the
 *      TWO-segment route `:id/edit` → `component: ProductEdit`, `:id = '42'`.
 *      `:id` (one segment) can never swallow this because the segment counts
 *      differ.
 *   3. `ProductEdit` turns `route.paramMap` into a signal with `toSignal`, so
 *      `productId()` reads `'42'` and the placeholder prints «ویرایش محصول ۴۲».
 *   4. The topbar heading reads the matched route's `data.title`
 *      («ویرایش محصول»); the breadcrumb chip reads `data.breadcrumb`;
 *      `data.permission` is the constant the future BO-D07 guard will read.
 */

/**
 * The permission that guards the whole module — one spelling, read by the
 * future BO-D07 guard and by the sidebar (whose menu item carries the same
 * string). Kept as a constant so a typo cannot diverge from `menu.ts`.
 */
const PRODUCTS_PERMISSION = 'products.view';

export const PRODUCTS_ROUTES: Routes = [
  {
    path: '',
    component: ProductList,
    title: 'محصولات',
    data: { title: 'محصولات', breadcrumb: 'محصولات', permission: PRODUCTS_PERMISSION },
  },

  // `new` is declared BEFORE `:id` on purpose: the router matches in order, so
  // the literal «new» must not be swallowed by the dynamic segment and rendered
  // as a detail page with `id = 'new'`.
  {
    path: 'new',
    component: ProductCreate,
    title: 'افزودن محصول',
    data: { title: 'افزودن محصول', breadcrumb: 'افزودن محصول', permission: PRODUCTS_PERMISSION },
  },

  // `:id/edit` (two segments) cannot be shadowed by `:id` (one segment), but the
  // more-specific path is listed first as a convention.
  {
    path: ':id/edit',
    component: ProductEdit,
    title: 'ویرایش محصول',
    data: { title: 'ویرایش محصول', breadcrumb: 'ویرایش محصول', permission: PRODUCTS_PERMISSION },
  },
  {
    path: ':id',
    component: ProductDetail,
    title: 'جزئیات محصول',
    data: { title: 'جزئیات محصول', breadcrumb: 'جزئیات محصول', permission: PRODUCTS_PERMISSION },
  },
];
