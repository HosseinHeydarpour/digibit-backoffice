import type { Environment } from './environment.model';

/**
 * Production values.
 *
 * `fileReplacements` in angular.json swaps this file in for `environment.ts`
 * when the production configuration is built, so these are the values that end
 * up inside the shipped bundle.
 */
export const environment = {
  production: true,
  API_BASE_URL: '/api/v1',
  APP_NAME: 'دیجی‌بیت مارکت — پنل مدیریت',
  TOKEN_STORAGE_KEY: 'digibit.office.token',
  DEFAULT_PAGE_SIZE: 20,
} satisfies Environment;
