import { test, expect } from '@playwright/test';
import { cartLines, findOrder, removeCartLine, setCartLineQuantity } from './api';

// F10 deep flow for `/order/:id`: "Mua lại" on a finished order either lands on
// /cart (every line re-added) or says, per line, what it could not re-add.
// The cart is put back to its pre-run lines and quantities afterwards.

test('"Mua lại" re-adds a finished order or explains what it skipped', async ({ page, request }) => {
  const order = await findOrder(request, (o) => o.status === 'completed' || o.status === 'canceled');
  test.skip(!order, 'no completed or canceled order to buy again');
  if (!order) return;
  const before = await cartLines(request);

  try {
    await page.goto(`/order/${order.id}`);
    await page.getByRole('button', { name: 'Mua lại' }).click();

    const toCart = page.getByRole('heading', { name: /Giỏ hàng/ });
    const panel = page.getByRole('status').filter({ hasText: 'Không thể thêm:' });
    await expect(toCart.or(panel).first()).toBeVisible({ timeout: 15_000 });
  } finally {
    const beforeById = new Map(before.map((l) => [l.id, l.quantity]));
    for (const line of await cartLines(request)) {
      const was = beforeById.get(line.id);
      if (was === undefined) await removeCartLine(request, line.id);
      else if (was !== line.quantity) await setCartLineQuantity(request, line.id, was);
    }
  }
});
