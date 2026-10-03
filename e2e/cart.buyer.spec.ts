import { test, expect } from '@playwright/test';
import { cartLines } from './api';

// Deep flow for `/cart`: change a line's quantity (persisted server-side), then
// narrow the selection and carry exactly that selection into `/checkout`.
//
// Leaves the cart as it found it: the quantity goes +1 then −1, and checkout is
// only opened, never confirmed — `checkout-resilience.buyer.spec.ts` needs the
// items to still be there.

test('quantity changes persist and the selection carries into checkout', async ({ page, request }) => {
  const lines = await cartLines(request);
  test.skip(lines.length < 2, 'Buyer cart needs at least 2 lines to exercise a partial selection');
  const line = lines[0];
  const others = lines.length - 1;

  await page.goto('/cart');
  await expect(page.getByRole('button', { name: `ĐẶT HÀNG (${lines.length}) →` })).toBeEnabled();
  const row = page.getByTestId(`cart-line-${line.id}`);
  const qty = row.getByTestId('cart-line-qty');
  const subtotal = page.getByTestId('cart-subtotal');
  await expect(qty).toHaveText(String(line.quantity));
  const initialSubtotal = await subtotal.innerText();

  // +1 then −1: each click is a PATCH the page re-reads, never a local-only tick.
  await row.getByRole('button', { name: 'Tăng số lượng' }).click();
  await expect(qty).toHaveText(String(line.quantity + 1));
  await expect
    .poll(async () => (await cartLines(request)).find((l) => l.id === line.id)?.quantity)
    .toBe(line.quantity + 1);

  await row.getByRole('button', { name: 'Giảm số lượng' }).click();
  await expect(qty).toHaveText(String(line.quantity));
  await expect
    .poll(async () => (await cartLines(request)).find((l) => l.id === line.id)?.quantity)
    .toBe(line.quantity);
  await expect(subtotal).toHaveText(initialSubtotal);

  // Nothing selected: nothing to order.
  await page.getByRole('checkbox', { name: `Chọn tất cả (${lines.length})` }).uncheck();
  await expect(subtotal).toHaveText('0 đ');
  await expect(page.getByRole('button', { name: 'ĐẶT HÀNG (0) →' })).toBeDisabled();
  await expect(page.getByText('Chọn ít nhất 1 sản phẩm để đặt hàng')).toBeVisible();

  // Everything but the first line → checkout lists exactly those.
  await page.getByRole('checkbox', { name: `Chọn tất cả (${lines.length})` }).check();
  await expect(subtotal).toHaveText(initialSubtotal);
  await row.getByRole('checkbox').uncheck();
  await page.getByRole('button', { name: `ĐẶT HÀNG (${others}) →` }).click();

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByText(`3. Sản phẩm (${others})`)).toBeVisible();
  expect(await cartLines(request), 'opening checkout must not touch the cart').toHaveLength(lines.length);
});
