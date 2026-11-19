import { expect, test } from '@playwright/test';

/**
 * Create-product flow (BO-P08).
 *
 * The mock backend is in-memory, so the product exists for this run only; a
 * reload resets it. That is exactly what makes the test repeatable without a
 * cleanup request.
 */
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
