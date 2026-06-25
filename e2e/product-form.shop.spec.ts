import { test, expect } from '@playwright/test';

// Covers UI-3 (auto-SKU needs only one click) and documents BE-4 (single-SKU
// create 502). UI-3 is pure client-side, so it runs today; BE-4 needs the
// write-path up and is left as a fixme with the full-flow recipe.

test.describe('Product create form', () => {
  test('UI-3: "Tự động tạo SKU" fills the SKU field on the first click', async ({ page }) => {
    await page.goto('/sell');

    const skuInput = page.getByPlaceholder('VD: IPHONE14PM-256-BLK');
    test.skip(!(await skuInput.isVisible().catch(() => false)), 'SKU field not on /sell (multi-variation mode?)');
    await expect(skuInput).toHaveValue('');

    await page.getByRole('button', { name: 'Tự động tạo SKU' }).click();

    // Bug UI-3: the first click is a no-op; a code only appears on the second.
    // Correct: one click generates a non-empty SKU.
    await expect(skuInput).not.toHaveValue('', { timeout: 3_000 });
  });

  // BE-4: single-SKU `POST /api/products` returns 502 while the identical multi-SKU
  // flow succeeds. Unblock when the products write-path is healthy, then implement:
  //   1. fill name / pick category / brand / condition
  //   2. upload an image from frontend/public/ (e.g. image2.png) into the file input
  //   3. keep "Nhiều phân loại" OFF (single SKU), set price 1000–4000 + stock
  //   4. submit and expect the success state, not "Không thể lưu tồn kho..." (UI-4)
  test.fixme('BE-4: single-SKU product creates successfully (no 502)', async () => {});
});
