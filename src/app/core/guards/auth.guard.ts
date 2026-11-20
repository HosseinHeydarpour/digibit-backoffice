import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { CanMatchFn } from '@angular/router';
import { CURRENT_USER } from '@core/auth/current-user.token';

/**
 * Keeps the shell behind a session. `canMatch` rather than `canActivate`, so a
 * signed-out visitor never downloads the lazy feature chunk they cannot open.
 */
export const authGuard: CanMatchFn = (_route, segments) => {
  if (inject(CURRENT_USER)()) {
    return true;
  }

  const returnUrl = '/' + segments.map((segment) => segment.path).join('/');
  const router = inject(Router);

  return router.createUrlTree(['/login'], {
    queryParams: returnUrl === '/' ? {} : { returnUrl },
  });
};
