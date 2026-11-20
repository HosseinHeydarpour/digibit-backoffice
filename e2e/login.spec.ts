import { expect, test } from '@playwright/test';

import { ADMIN } from './support/api';

/**
 * BO-P07. Starts from a signed-out context on purpose: the setup project's
 * storageState is for the authenticated specs, and this one is the login itself.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test('signs in with the seeded admin and lands on the dashboard', async ({ page }) => {
  await page.goto('/login');

  await page.fill('#login-email', ADMIN.email);
  await page.fill('#login-password', ADMIN.password);
  await page.click('button[type=submit]');

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page.getByText('پیشخوان').first()).toBeVisible();
});

test('shows a Persian message for a wrong password', async ({ page }) => {
  await page.goto('/login');

  await page.fill('#login-email', ADMIN.email);
  await page.fill('#login-password', 'WrongPassword123');
  await page.click('button[type=submit]');

  await expect(page.getByRole('alert')).toContainText('ایمیل یا رمز عبور نادرست است.');
});
