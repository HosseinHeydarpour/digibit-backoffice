// src/app/core/interceptors/error-interceptor.ts
//
// WHAT THIS IS
// ------------
// The one place a failed request becomes something the user can see. Every error
// response is normalised, reported through `ToastService`, and then passed on:
//
//   GET /products -> 500 { error: { code: 'SERVER', message: 'خطای سرور' } }
//                    |
//                    +-> toast.error('خطای سرور')        (tc 8)
//                    +-> the caller's `error` branch     (unchanged)
//
// WHY AN INTERCEPTOR AND NOT EACH SERVICE
// ---------------------------------------
// A feature service that forgets its `error` branch fails silently: the button
// looks like it did nothing. Reporting at the boundary means a failure is always
// visible, and a feature only writes the handling that is specific to it —
// keeping a dialog open, marking a field red.
//
// WHY IT RE-USES `toApiError`
// ---------------------------
// What the toast says must be what the caller receives, or the corner of the
// screen and the inline message would disagree about the same failure. Both go
// through one normalisation function, so the envelope shape, the network-down
// case and the malformed-body case are decided in exactly one place.
//
// WHY A VALIDATION ERROR IS NOT TOASTED
// -------------------------------------
// A 400 with `fields` is a message for the form, not for the corner of the
// screen: each field is about to show its own error, right next to the input
// that has to be corrected. Toasting it as well would report the same failure
// twice, and the second copy would be the useless one — it cannot point at a
// field. `ApiError.isValidation` is exactly that distinction, which is why it is
// used here instead of a status-code comparison.
//
// WHAT IS DELIBERATELY NOT HERE
// -----------------------------
// A 401 is toasted like any other failure for now. Redirecting to the login page
// belongs to the auth tasks (BO-D07/D08), which will decide it in one place —
// a redirect here would make every concurrent request race to navigate.
//
// The interceptor is registered in app.config.ts BEFORE the mock interceptor, so
// it is the outermost handler and sees the failure whatever produced it.

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { toApiError } from '@core/services/api';
import { ToastService } from '@core/services/toast';
import { catchError, throwError } from 'rxjs';

/**
 * Reports every failed request through the toast, then rethrows it normalised.
 *
 * @example A caller handles only what it can act on
 * ```ts
 * this.products.create(draft).subscribe({
 *   next: () => this.toast.success('محصول ذخیره شد.'),
 *   // No `error` branch for the unexpected case: the interceptor has already
 *   // told the user. Add one only to do something specific, such as keeping the
 *   // form open or highlighting a field.
 * });
 * ```
 */
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const toast = inject(ToastService);

  return next(request).pipe(
    catchError((error: unknown) => {
      const apiError = toApiError(error);

      if (!apiError.isValidation) {
        toast.error(apiError.message);
      }

      // The normalised error travels on: this interceptor reports, it does not
      // decide. `ApiService`'s own `catchError` then sees an `ApiError` and
      // passes it straight through, so a caller receives exactly what it always
      // received.
      return throwError(() => apiError);
    }),
  );
};
