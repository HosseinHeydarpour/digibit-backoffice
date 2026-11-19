import { expect, test } from '@playwright/test';

/** Order status flow (BO-P09): list → detail → transition → toast + history. */
test('moves an order from processing to shipped', async ({ page }) => {
  await page.goto('/orders?status=processing');

  await page.locator('tbody tr').first().click();
  await expect(page).toHaveURL(/\/orders\/.+/);
  await expect(page.getByText('در حال پردازش').first()).toBeVisible();

  await page.getByRole('button', { name: 'تغییر وضعیت' }).click();
  await page.locator('#order-next-status').click();
  await page.getByRole('option', { name: 'ارسالشده' }).click();
  await page.getByRole('button', { name: 'ثبت وضعیت' }).click();

  await expect(page.getByText('وضعیت سفارش به‌روز شد.')).toBeVisible();
  await expect(page.getByText('ارسالشده').first()).toBeVisible();
});

test('cancels a processing order only after a reason', async ({ page }) => {
  await page.goto('/orders?status=processing');
  await page.locator('tbody tr').first().click();

  await page.getByRole('button', { name: 'لغو سفارش' }).click();
  await page.getByRole('dialog').last().getByRole('button', { name: 'لغو سفارش' }).click();
  await expect(page.getByText('دلیل لغو را انتخاب یا بنویس.')).toBeVisible();

  await page.locator('#order-cancel-reason').click();
  await page.getByRole('option', { name: 'انصراف مشتری' }).click();
  await page.getByRole('dialog').last().getByRole('button', { name: 'لغو سفارش' }).click();

  await expect(page.getByText('سفارش لغو شد.')).toBeVisible();
  await expect(page.getByText('لغوشده').first()).toBeVisible();
});
