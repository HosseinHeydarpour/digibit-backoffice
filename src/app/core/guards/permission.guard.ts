import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { CanActivateFn, CanMatchFn } from '@angular/router';
import { PermissionsService } from '@core/auth/permissions.service';

/**
 * Allows a route whose declared permission is present; sends the user to
 * `/forbidden` otherwise. A route without `data.permission` stays public to any
 * signed-in user, exactly as a menu item without one does.
 *
 * This is the in-chunk guard. The parent `loadChildren` node also carries
 * `data.permission` + `permissionMatchGuard`, so a user without the grant never
 * downloads the module at all; this one still protects a direct match inside a
 * chunk that was already loaded.
 */
export const permissionGuard: CanActivateFn = (route) => {
  const permission = route.data?.['permission'];

  if (typeof permission !== 'string') {
    return true;
  }

  if (inject(PermissionsService).hasPermission(permission)) {
    return true;
  }

  return inject(Router).createUrlTree(['/forbidden']);
};

/**
 * The same decision at the `canMatch` stage, before a lazy chunk is fetched.
 *
 * `app.routes.ts` puts this on each module's parent (`products`, `orders`, …)
 * and the permission on that node's `data`, which is readable without loading
 * the chunk.
 */
export const permissionMatchGuard: CanMatchFn = (route) => {
  const permission = route.data?.['permission'];

  if (typeof permission !== 'string') {
    return true;
  }

  if (inject(PermissionsService).hasPermission(permission)) {
    return true;
  }

  return inject(Router).createUrlTree(['/forbidden']);
};
