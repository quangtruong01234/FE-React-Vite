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

// Waits for the cart to settle on either the checkout CTA or the empty state.
// A non-waiting read (`isVisible()`, `textContent()`) taken while the lazy
// page still shows skeletons answered "empty" and skipped the test vacuously.
async function cartHasItems(page: import('@playwright/test').Page): Promise<boolean> {
  const placeOrder = page.getByRole('button', { name: /ĐẶT HÀNG/ });
  await expect(placeOrder.or(page.getByText('Giỏ hàng trống'))).toBeVisible();
  return placeOrder.isVisible();
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
    await expect(placeOrder).toBeEnabled();
    await placeOrder.click();

    await expect(page).toHaveURL(/\/checkout/);
    // Bug FE-3: `disabled={... || productsError ...}` blocks an order that is fully
    // creatable from ids. Correct: confirm stays enabled despite enrichment failure.
    const confirm = page.getByRole('button', { name: /XÁC NHẬN ĐẶT HÀNG/ });
    await expect(confirm).toBeVisible();
    await expect(confirm).toBeEnabled();
  });
});

// SWEEP-1002-01: a create that dies without an answer (here a forced 504) may
// still have committed, and the backend now holds the Idempotency-Key for 300s.
// The buyer must be sent to check their orders, and re-placing must take an
// explicit confirm that mints a NEW key. Every POST is intercepted, so no real
// order is ever created.
test.describe('Checkout — unknown order outcome', () => {
  test('504 on create shows the check-your-orders notice and gates re-placing', async ({ page }) => {
    const keys: string[] = [];
    await page.route('**/api/order', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      keys.push(route.request().headers()['idempotency-key'] ?? '');
      await route.fulfill({
        status: 504,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 504, status: 'error', message: 'Gateway Timeout' }),
      });
    });

    await page.goto('/cart');
    test.skip(!(await cartHasItems(page)), 'Buyer cart is empty — cannot reach checkout');
    await page.getByRole('button', { name: /ĐẶT HÀNG/ }).click();
    await expect(page).toHaveURL(/\/checkout/);

    const confirm = page.getByRole('button', { name: /XÁC NHẬN ĐẶT HÀNG/ });
    await expect(confirm).toBeVisible();
    // The button is disabled until the address book and fee preview settle —
    // wait for that before deciding the buyer genuinely cannot submit.
    const canSubmit = await expect(confirm)
      .toBeEnabled({ timeout: 15_000 })
      .then(() => true, () => false);
    test.skip(!canSubmit, 'Checkout blocked (no address / stock) — cannot submit');
    await confirm.click();

    const notice = page.getByRole('alert').filter({ hasText: 'Đơn hàng có thể đã được tạo.' });
    await expect(notice).toBeVisible();
    await expect(notice.getByRole('link', { name: 'Đơn hàng của tôi' })).toHaveAttribute('href', '/orders');
    expect(keys).toHaveLength(1);

    // Re-submitting asks first; backing out sends nothing.
    await confirm.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Đặt lại đơn hàng?')).toBeVisible();
    await dialog.getByRole('button', { name: 'Để tôi kiểm tra' }).click();
    await expect(dialog).toBeHidden();
    expect(keys).toHaveLength(1);

    // Confirming re-places with a fresh key — the held one would only 409.
    await confirm.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Đặt lại' }).click();
    await expect.poll(() => keys.length).toBe(2);
    expect(keys[1]).not.toBe('');
    expect(keys[1]).not.toBe(keys[0]);
  });
});
