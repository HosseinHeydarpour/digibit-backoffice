import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LoadingService } from '@core/services/loading';
import { finalize } from 'rxjs';

/**
 * Counts every request for the global progress bar (BO-C05).
 *
 * Auth endpoints are excluded: the login/refresh round-trips are exactly when a
 * full-width bar over the form is noise, and the login page has its own busy
 * button. `finalize` runs on success, error and cancellation, so a failed or
 * aborted request cannot leave the bar stuck.
 */
export const loadingInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.url.includes('/auth/')) {
    return next(request);
  }

  const loading = inject(LoadingService);
  loading.start();

  return next(request).pipe(finalize(() => loading.stop()));
};
