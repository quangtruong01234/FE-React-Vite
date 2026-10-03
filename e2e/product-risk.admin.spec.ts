import { test, expect, type APIRequestContext } from '@playwright/test';
import { ownProduct } from './api';

// Deep flow for `/admin/product-risk`: find one product by name, rescore it,
// and check the toast and the card both carry the score the API returned; then
// the "Rủi ro cao" filter keeps the card only when that score is ≥ 70.
//
// Rescoring recomputes the advisory score from the product as it stands, so it
// is safe to repeat. The duplicate-feedback buttons are not exercised: each
// click writes an audit record.

let shop: APIRequestContext;

test.beforeAll(async ({ playwright, baseURL }) => {
  shop = await playwright.request.newContext({ baseURL, storageState: 'e2e/.auth/shop.json' });
});

test.afterAll(async () => {
  await shop.dispose();
});

test('rescoring a product shows its new score in the toast and on its card; the score filter follows it', async ({ page }) => {
  const product = await ownProduct(shop);
  test.skip(!product, 'The shop account has no product to rescore');
  const { id, name } = product!;

  await page.goto('/admin/product-risk?minScore=0');
  await expect(page.getByRole('heading', { name: 'Rủi ro sản phẩm' })).toBeVisible();
  await page.getByPlaceholder('Tìm theo tên sản phẩm…').fill(name);
  const card = page.getByTestId(`risk-product-${id}`);
  await expect(card).toBeVisible();

  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes(`/admin/risk/${id}/rescore`) && r.request().method() === 'POST'),
    card.getByRole('button', { name: 'Chấm điểm lại' }).click(),
  ]);
  expect(response.ok(), 'rescore request').toBe(true);
  const { riskScore } = ((await response.json()) as { data: { riskScore: number } }).data;

  await expect(page.getByText(`Đã chấm điểm lại sản phẩm #${id} — điểm rủi ro mới: ${riskScore}/100.`)).toBeVisible();
  await expect(card).toContainText(`· ${riskScore}/100`);

  await page.getByRole('button', { name: 'Rủi ro cao', exact: true }).click();
  await expect(page).toHaveURL(/minScore=70/);
  if (riskScore >= 70) {
    await expect(card).toBeVisible();
  } else {
    await expect(card, 'a score under 70 is filtered out of "Rủi ro cao"').toHaveCount(0);
  }

  await page.getByRole('button', { name: 'Tất cả sản phẩm', exact: true }).click();
  await expect(page).toHaveURL(/minScore=0/);
  await expect(card).toBeVisible();
});
