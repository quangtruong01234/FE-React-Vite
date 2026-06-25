import { test, expect } from '@playwright/test';

// Covers BE-3 / FE-3 / FE-4: when the batch enrichment endpoint
// (POST /api/products/with-inventory/multiple) fails, the cart/checkout must
// degrade gracefully — not mislabel live products as deleted, not show 0đ, not
// hard-block the order (price is computed server-side from ids alone).
//
// The failure is FORCED via route interception (500, mirroring the AggregateError
// seen in the audit) so the test is deterministic regardless of backend health.

async function failBatchEnrichment(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/products/with-inventory/multiple', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 500, status: 'error', message: 'AggregateError' }),
    });
  });
}

async function cartHasItems(page: import('@playwright/test').Page): Promise<boolean> {
  const badge = page.getByRole('link', { name: /Giỏ hàng/ }).locator('span').first();
  const txt = (await badge.textContent().catch(() => '')) ?? '';
  return /\d/.test(txt) && txt.trim() !== '0';
}

test.describe('Cart / checkout resilience to enrichment failure', () => {
  test('FE-4: enrichment 500 must not mislabel live products as "không còn tồn tại"', async ({ page }) => {
    await failBatchEnrichment(page);
    await page.goto('/cart');
    test.skip(!(await cartHasItems(page)), 'Buyer cart is empty — nothing to enrich');

    // Bug FE-4: on enrichment failure rows fall back to "Sản phẩm không còn tồn tại"
    // at 0đ even though the products exist. Correct: show a transient/error state,
    // never claim the product was deleted.
    await expect(page.getByText('Sản phẩm không còn tồn tại')).toHaveCount(0);
  });

  test('FE-3: checkout confirm must not be disabled by a display-only fetch error', async ({ page }) => {
    await page.goto('/cart');
    test.skip(!(await cartHasItems(page)), 'Buyer cart is empty — cannot reach checkout');

    await failBatchEnrichment(page);
    const placeOrder = page.getByRole('button', { name: /ĐẶT HÀNG/ });
    test.skip(!(await placeOrder.isVisible().catch(() => false)), 'Place-order CTA unavailable');
    await placeOrder.click();

    await expect(page).toHaveURL(/\/checkout/);
    // Bug FE-3: `disabled={... || productsError ...}` blocks an order that is fully
    // creatable from ids. Correct: confirm stays enabled despite enrichment failure.
    const confirm = page.getByRole('button', { name: /XÁC NHẬN ĐẶT HÀNG/ });
    await expect(confirm).toBeVisible();
    await expect(confirm).toBeEnabled();
  });
});
