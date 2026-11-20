import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { readAccessToken } from '@core/auth/token-storage';
import { AuthService } from '@core/services/auth';
import { catchError, switchMap, throwError } from 'rxjs';

/** The endpoints that must never carry a stale token or trigger a refresh. */
function isAuthEndpoint(url: string): boolean {
  return url.includes('/auth/admin/login') || url.includes('/auth/refresh');
}

/**
 * Attaches the access token and turns one 401 into one refresh + retry.
 *
 * The retry is what makes a short-lived access token invisible to the user; the
 * refresh request itself is excluded, or a rejected refresh would recurse. When
 * the refresh is rejected too, `AuthService.expireSession()` reports it once and
 * navigates; this interceptor never navigates ten times for ten requests.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);

  const token = readAccessToken();
  const authorized =
    token && !isAuthEndpoint(request.url)
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        isAuthEndpoint(request.url)
      ) {
        return throwError(() => error);
      }

      return auth.refresh().pipe(
        switchMap((pair) =>
          next(
            request.clone({
              setHeaders: { Authorization: `Bearer ${pair.accessToken}` },
            }),
          ),
        ),
        catchError((refreshError: unknown) => {
          auth.expireSession();

          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
