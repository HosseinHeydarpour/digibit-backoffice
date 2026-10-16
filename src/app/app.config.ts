import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { LOCALE_ID, signal } from '@angular/core';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { errorInterceptor } from '@core/interceptors/error-interceptor';
import { mockInterceptor } from '@core/mock/mock-interceptor';
import { environment } from '@env/environment';
import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import { MENU_PERMISSIONS } from './layout/sidebar/menu';

/**
 * Aura with the Digibit brand colour substituted into the primary palette.
 *
 * Every PrimeNG component reads `--p-primary-*` from this, so the brand orange
 * reaches buttons, tables and focus rings without any per-component overrides.
 * The value matches `--color-primary` in src/styles/tailwind.css.
 */
const DigibitPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fff4ec',
      100: '#ffe4d1',
      200: '#ffc9a3',
      300: '#ffae75',
      400: '#ff9847',
      500: '#ff8229',
      600: '#d96b1f',
      700: '#b76122',
      800: '#8c4a1a',
      900: '#6b3814',
      950: '#3d1f0a',
    },
  },
});

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

    // BO-D08 replaces this with the real list from /auth/me. Until then the
    // token's own default is an empty set, which is the correct secure default
    // but renders an empty sidebar — so mock mode grants everything to keep
    // local development usable. Production gets nothing, and therefore a
    // dashboard-only menu, until D08 lands.
    ...(environment.useMockApi
      ? [{ provide: PERMISSIONS, useValue: signal<readonly string[]>(MENU_PERMISSIONS) }]
      : []),

    provideHttpClient(
      withFetch(),
      withInterceptors([
        // The error interceptor is registered FIRST, which makes it the
        // outermost handler: whether the failure comes from the mock layer, from
        // the network, or from a body that is not the envelope it should be, it
        // passes through here on its way back to the caller. BO-B12.
        errorInterceptor,
        ...(environment.useMockApi ? [mockInterceptor] : []),
      ]),
    ),

    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),

    providePrimeNG({
      theme: {
        preset: DigibitPreset,
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
