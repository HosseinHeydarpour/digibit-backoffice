import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { LOCALE_ID } from '@angular/core';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { DIGIBIT_PRESET } from '@core/digibit-preset';
import { authInterceptor } from '@core/interceptors/auth-interceptor';
import { errorInterceptor } from '@core/interceptors/error-interceptor';
import { AuthService } from '@core/services/auth';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';

/**
 * Root providers.
 *
 * `provideHttpClient` is registered before the router so a feature service that
 * injects HttpClient can be constructed while routes resolve — a missing
 * provider here is the usual cause of a NullInjectorError at boot.
 *
 * There is deliberately no `provideAnimationsAsync()`. PrimeNG 21 animates
 * through `@primeuix/motion`, which is CSS driven, and never imports
 * `@angular/animations`. That package is not a dependency of this project, so
 * the provider would have nothing to configure.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),

    // Dates and numbers render in Persian. Angular's fa-IR data comes from the
    // built-in Intl implementation, so no registerLocaleData call is needed.
    { provide: LOCALE_ID, useValue: 'fa-IR' },

    // Restores the session from the stored tokens before the first navigation,
    // so `authGuard` sees the signed-in user on a page refresh instead of
    // bouncing to /login for one frame.
    provideAppInitializer(() => inject(AuthService).restore()),

    provideHttpClient(
      withFetch(),
      withInterceptors([
        // The error interceptor is registered FIRST, which makes it the
        // outermost handler: whether the failure comes from the network or from
        // a body that is not the envelope it should be, it passes through here
        // on its way back to the caller. BO-B12.
        errorInterceptor,
        authInterceptor,
      ]),
    ),

    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),

    providePrimeNG({
      theme: {
        preset: DIGIBIT_PRESET,
        options: { darkModeSelector: '.app-dark' },
      },
    }),

    // PrimeNG's ConfirmationService is NOT `providedIn: 'root'` — unlike its
    // config service, which is — so the confirm dialog would throw a
    // NullInjectorError on first use. `ConfirmService` injects it and is itself
    // injected by the root shell, so this one registration is the app-wide
    // instance the dialog host subscribes to. BO-B11.
    ConfirmationService,

    // MessageService is not root-provided either, for the same reason and with
    // the same failure mode: the toast would throw a NullInjectorError the first
    // time a feature reported anything. It is the channel `ToastService` writes
    // to and the toast host reads from, so both halves must share this one
    // instance. BO-B12.
    MessageService,
  ],
};
