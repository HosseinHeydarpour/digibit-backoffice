import { expect, test } from '@playwright/test';

import { adminToken, seedProcessingOrder } from './support/api';

// The two tests share the Processing queue; running them in parallel lets one
// test ship the order the other is about to cancel.
test.describe.configure({ mode: 'serial' });

/**
 * Order status flow (BO-P09), against the real API.
 *
 * A fresh Processing order is seeded before each test: a fresh database has no
 * orders, and a previous test's transition would leave the queue without one.
 * The seed creates its own customer (OTP), cart, checkout and two admin
 * transitions, so the test starts exactly where the UI flow begins.
 */
test.beforeEach(async ({ request }) => {
  const token = await adminToken(request);
  await seedProcessingOrder(request, token);
});

test('moves an order from processing to shipped', async ({ page }) => {
  await page.goto('/orders?status=processing');

  await page.locator('tbody tr').first().click();
  await expect(page).toHaveURL(/\/orders\/.+/);
  await expect(page.getByText('در حال پردازش').first()).toBeVisible();

  await page.getByRole('button', { name: 'تغییر وضعیت' }).click();
  await page.locator('#order-next-status').click();
  await page.getByRole('option', { name: /ارسال/ }).click();
  await page.getByRole('button', { name: 'ثبت وضعیت' }).click();

  await expect(page.getByText('وضعیت سفارش به‌روز شد.')).toBeVisible();
  await expect(page.getByText('ارسال شده').first()).toBeVisible();
});

test('cancels a processing order only after a reason', async ({ page }) => {
  await page.goto('/orders?status=processing');
  await page.locator('tbody tr').first().click();

  await page.getByRole('button', { name: 'لغو سفارش' }).click();
  await page.getByRole('dialog').last().getByRole('button', { name: 'لغو سفارش' }).click();
  await expect(page.getByText('دلیل لغو را انتخاب یا بنویس.')).toBeVisible();

  await page.locator('#order-cancel-reason').click();
  await page.getByRole('option', { name: /انصراف/ }).click();
  await page.getByRole('dialog').last().getByRole('button', { name: 'لغو سفارش' }).click();

  await expect(page.getByText('سفارش لغو شد.')).toBeVisible();
  await expect(page.getByText('لغو شده').first()).toBeVisible();
});
