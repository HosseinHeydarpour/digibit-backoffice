import { provideHttpClient, withFetch } from '@angular/common/http';
import { LOCALE_ID } from '@angular/core';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';

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

    provideHttpClient(withFetch()),

    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),

    providePrimeNG({
      theme: {
        preset: DigibitPreset,
        options: { darkModeSelector: '.app-dark' },
      },
    }),
  ],
};
