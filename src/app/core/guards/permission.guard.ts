// src/app/core/guards/permission.guard.ts
//
// The first route guard in the panel (BO-I06, the seam BO-D07 formalises).
//
// A route declares what it needs in `data.permission` — the same string the
// sidebar item carries — and this guard answers one question: does the signed-in
// admin hold it? If not, the router renders `/forbidden` instead of the page.
//
// WHY IT IS FAIL-CLOSED
// ---------------------
// `PERMISSIONS` defaults to an EMPTY set. A missing provider (a misconfigured
// shell, a production build that never loaded `/auth/me`) therefore blocks
// every protected route rather than granting it. The alternative — "no grants
// means show everything" — turns a wiring mistake into an open admin panel.
//
// WHY A GUARD AND NOT A HIDDEN MENU ITEM
// --------------------------------------
// Filtering `MENU` only hides the link; typing the URL still opens the page.
// This closes that hole for the routes that declare a permission. It is still
// UI gating: the server validates every write (ARCHITECTURE.md §6).
//
// TRACE — a Support user without `customers.block` opens `/customers/3`:
//   1. `app.routes.ts` lazily loads `CUSTOMERS_ROUTES`.
//   2. The matched route declares `data.permission: 'customers.view'`.
//   3. `inject(PERMISSIONS)()` is `['orders.view', 'customers.view']`, so the
//      guard returns `true` and the profile renders; the status switch is
//      absent because the COMPONENT checks `customers.block`.
//   4. The same user opens `/coupons`: the grant is missing, so the guard
//      returns a `UrlTree` for `/forbidden` and the page never constructs.

import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { CanActivateFn } from '@angular/router';
import { PERMISSIONS } from '@core/auth/permissions.token';

/**
 * Allows a route whose declared permission is present; sends the user to
 * `/forbidden` otherwise. A route without `data.permission` stays public to any
 * signed-in user, exactly as a menu item without one does.
 */
export const permissionGuard: CanActivateFn = (route) => {
  const permission = route.data?.['permission'];

  if (typeof permission !== 'string') {
    return true;
  }

  if (inject(PERMISSIONS)().includes(permission)) {
    return true;
  }

  return inject(Router).createUrlTree(['/forbidden']);
};
