import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
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

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    providePrimeNG({
      theme: {
        preset: DigibitPreset,
        options: { darkModeSelector: '.app-dark' },
      },
    }),
  ],
};
