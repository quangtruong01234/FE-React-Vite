import { test, expect } from '@playwright/test';
import { buyableProduct, cartLines, removeCartLine, setCartLineQuantity } from './api';

// F9 deep flow for `/product/:id`: "Mua ngay" adds the line and opens checkout
// with only that line selected. Stops at /checkout — placing the order belongs
// to `checkout-*`. The cart line goes back to what it was before the run.

test('"Mua ngay" opens checkout with only the product just added', async ({ page, request }) => {
  const product = await buyableProduct(request);
  test.skip(product === null, 'no in-stock, single-SKU product from another seller to target');
  if (product === null) return;
  const { id, name } = product;
  const before = (await cartLines(request)).find((l) => l.productId === id);

  try {
    await page.goto(`/product/${id}`);
    await expect(page.getByRole('heading', { name })).toBeVisible();
    await page.getByRole('button', { name: 'MUA NGAY' }).click();

    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByText(name).first()).toBeVisible();
    await expect
      .poll(async () => (await cartLines(request)).find((l) => l.productId === id)?.quantity ?? 0)
      .toBe((before?.quantity ?? 0) + 1);
  } finally {
    const after = (await cartLines(request)).find((l) => l.productId === id);
    if (after && before) await setCartLineQuantity(request, after.id, before.quantity);
    else if (after) await removeCartLine(request, after.id);
  }
});
