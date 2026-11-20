import { expect, test as setup } from '@playwright/test';

import { ADMIN } from './support/api';

const AUTH_FILE = 'e2e/.auth/admin.json';

/**
 * One real login before the suite (BO-P06/P07), saved as Playwright's
 * `storageState`. Every authenticated spec starts from that state instead of
 * repeating the form and relying on a previous test's browser.
 */
setup('authenticate as the seeded admin', async ({ page }) => {
  await page.goto('/login');

  await page.fill('#login-email', ADMIN.email);
  await page.fill('#login-password', ADMIN.password);
  await page.click('button[type=submit]');

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  await page.context().storageState({ path: AUTH_FILE });
});
