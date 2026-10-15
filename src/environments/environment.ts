import type { Environment } from './environment.model';

/**
 * Development values.
 *
 * The API points at the local backend; `npm start` talks to it directly, so no
 * proxy is needed.
 */
export const environment = {
  production: false,
  API_BASE_URL: 'http://localhost:5000/api/v1',
  APP_NAME: 'دیجی‌بیت مارکت — پنل مدیریت',
  TOKEN_STORAGE_KEY: 'digibit.office.token',
  DEFAULT_PAGE_SIZE: 20,
} satisfies Environment;
