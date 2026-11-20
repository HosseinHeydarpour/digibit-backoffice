import { expect, test } from '@playwright/test';

import { adminToken, ensureCategory } from './support/api';

/**
 * Create-product flow (BO-P08), against the real API.
 *
 * The category lookup is seeded once because a fresh database has no option to
 * choose, and the wizard cannot leave the main tab without one. The product is
 * created with a timestamped name/slug, so consecutive runs never collide.
 */
test.beforeAll(async ({ request }) => {
  const token = await adminToken(request);
  await ensureCategory(request, token);
});

test('creates a product and opens its edit page', async ({ page }) => {
  const name = `گوشی تست ${Date.now()}`;

  await page.goto('/products/new');
  await page.fill('#product-name', name);
  await page.fill('#product-sku', `E2E-${Date.now()}`);
  await page.fill('#product-price', '2500000');

  await page.locator('#product-category').click();
  await page.getByRole('option').first().click();

  // The wizard will not advance past an empty variant array (F10's rule), so add
  // one complete row before asking to save.
  await page.locator('[data-next]').click();
  await page.locator('#panel-variants button').first().click();
  await page.fill('#variant-sku-0', `E2E-V-${Date.now()}`);
  await page.fill('#variant-price-0', '2500000');
  await page.fill('#variant-stock-0', '5');

  await page.locator('[data-next]').click();
  await page.locator('[data-next]').click();
  await page.locator('[data-save]').click();

  await expect(page).toHaveURL(/\/products\/.+\/edit/, { timeout: 15_000 });
  await expect(page.getByText('محصول با موفقیت ایجاد شد.')).toBeVisible();

  await expect(page.locator('#product-name')).toHaveValue(name);
});

test('refuses a product without a name', async ({ page }) => {
  await page.goto('/products/new');

  await page.fill('#product-price', '1000000');
  await page.locator('[data-next]').click();

  await expect(page.getByText(/الزامی است|وارد کنید/).first()).toBeVisible();
  await expect(page).toHaveURL(/\/products\/new/);
});
