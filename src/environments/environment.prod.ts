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
  // «بازگشت به سایت» in the topbar's profile menu (BO-B06) opens this in a new
  // tab. The storefront domain from the project README — the panel is a
  // separate deployment, so this must be absolute, never a route of this app.
  //
  // Added here because `satisfies Environment` made the omission a COMPILE
  // error in the production build only: `environment.model.ts` declares the
  // field, the dev file set it, and `ng build --configuration production` was
  // the first thing that checked this one.
  SITE_URL: 'https://digibitshop.ir',
  DEFAULT_PAGE_SIZE: 20,
  useMockApi: false,
  mockDelayMs: 0,
} satisfies Environment;
