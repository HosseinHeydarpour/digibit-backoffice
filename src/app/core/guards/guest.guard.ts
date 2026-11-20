import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { CanMatchFn } from '@angular/router';
import { CURRENT_USER } from '@core/auth/current-user.token';

/**
 * `/login` is for signed-out visitors. An already signed-in user is sent to the
 * dashboard instead of being shown a second login form (BO-D06 tc 3).
 */
export const guestGuard: CanMatchFn = () => {
  if (!inject(CURRENT_USER)()) {
    return true;
  }

  return inject(Router).createUrlTree(['/dashboard']);
};
