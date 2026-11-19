// src/app/features/orders/orders.routes.ts
//
// The orders module's routes, owned by the module — the same `loadChildren`
// contract the dashboard and products established. `app.routes.ts` only points
// here; each page's `title`/`breadcrumb`/`permission` stays next to the page.
//
// PERMISSION NOTE: every route declares `data.permission: 'orders.view'`, the
// SAME string the sidebar menu item carries. Declarative until BO-D07's guard
// lands; the constant exists so the guard has one spelling to read.
//
// TRACE — `/orders/12`:
//   1. The `orders` node in `app.routes.ts` lazily pulls this chunk.
//   2. `''` needs an empty remainder, so the router reaches `:id`.
//   3. `orderDetailResolver` loads the full order; a 404 becomes a
//      `RedirectCommand` to the catch-all 404 page, any other failure becomes
//      `{ error }` and the page shows its retry block.
//   4. `withComponentInputBinding()` writes `detail` into `OrderDetail.detail`,
//      so the first paint is already the data.
//   5. `runGuardsAndResolvers: 'always'` + the page's
//      `navigateByUrl(url, { onSameUrlNavigation: 'reload' })` make «تلاش
//      دوباره» re-run the resolver instead of replaying the cached error.

import { Routes } from '@angular/router';

import { OrderDetail } from './order-detail/order-detail';
import { orderDetailResolver } from './order-detail/order-detail.resolver';
import { OrderList } from './order-list/order-list';

/** One spelling of the module permission — same string as `menu.ts`. */
const ORDERS_PERMISSION = 'orders.view';

export const ORDERS_ROUTES: Routes = [
  {
    path: '',
    component: OrderList,
    title: 'سفارش‌ها',
    data: { title: 'سفارش‌ها', breadcrumb: 'سفارش‌ها', permission: ORDERS_PERMISSION },
  },
  {
    path: ':id',
    component: OrderDetail,
    title: 'جزئیات سفارش',
    runGuardsAndResolvers: 'always',
    resolve: { detail: orderDetailResolver },
    data: { title: 'جزئیات سفارش', breadcrumb: 'جزئیات سفارش', permission: ORDERS_PERMISSION },
  },
];
