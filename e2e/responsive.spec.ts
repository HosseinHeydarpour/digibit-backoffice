import { expect, test } from '@playwright/test';

/**
 * BO-B17: the phone matrix, automated at 375px.
 *
 * Real-device screen readers are still manual, but the two failures a phone
 * actually hits first — a page wider than the viewport and a drawer that cannot
 * be opened — are pinned here.
 */
test.use({ viewport: { width: 375, height: 812 } });

for (const path of ['/dashboard', '/products', '/categories']) {
  test(`${path} does not scroll the page sideways at 375px`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('app-page-header')).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );

    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test('the mobile hamburger opens the drawer', async ({ page }) => {
  await page.goto('/dashboard');

  await page.locator('header button').first().click();

  await expect(page.getByRole('dialog')).toBeVisible();
});
