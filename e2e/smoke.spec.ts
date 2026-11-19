import { expect, test } from '@playwright/test';

/**
 * Smoke (BO-P06 tc 4): the shell boots, the dashboard route resolves and the
 * lazy chunk paints its heading. This is the test that would fail first if the
 * app or the mock interceptor stopped starting.
 */
test('dashboard boots with its heading and cards', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.locator('app-page-header')).toBeVisible();
  await expect(page.getByText('پیشخوان').first()).toBeVisible();
});

test('unknown route lands on the 404 page', async ({ page }) => {
  await page.goto('/this-route-does-not-exist');

  await expect(page.getByText('صفحه یافت نشد').first()).toBeVisible();
});
