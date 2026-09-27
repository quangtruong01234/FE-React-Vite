import { test, expect, type Page } from '@playwright/test';
import { listSellerOrders, sellerOrderStatus, type SellerOrderRow } from './api';

// Deep flow for `/sell/orders`: the seller's half of the order state machine
// (`sellerOrderActions.ts`) — pending → confirmed ("Xác nhận đơn"), then
// confirmed → processing ("Sẵn sàng giao", which creates the GHN waybill).
//
// Writes real data: each run spends one pending order of the shop account and
// hands one confirmed order to GHN. Both tests skip once that data runs out.

// An unpaid online order shows a blocked reason instead of the button
// (ORD-GUARD-01), so only pick rows the seller can actually act on.
function actionable(o: SellerOrderRow): boolean {
  return o.paymentMethod === 'cod' || o.paidAt !== null;
}

async function openTab(page: Page, status: 'pending' | 'confirmed'): Promise<void> {
  await page.goto(`/sell/orders?status=${status}`);
  await expect(page.getByRole('heading', { name: 'Đơn hàng cần xử lý' })).toBeVisible();
}

test.describe('Seller orders — confirm and hand off to GHN', () => {
  test('confirming a pending order moves it to "Đã xác nhận"', async ({ page, request }) => {
    const order = (await listSellerOrders(request, 'pending')).find(actionable);
    test.skip(!order, 'Shop has no actionable pending order left to confirm');
    const id = order!.id;

    await openTab(page, 'pending');
    const card = page.getByTestId(`seller-order-${id}`);
    await card.getByRole('button', { name: 'Xác nhận đơn' }).click();

    // The seller list is invalidated on success — the order leaves the pending tab.
    await expect(card, 'confirmed order should leave the "Chờ xác nhận" tab').toHaveCount(0);
    await expect(page.getByText(`#${id} ·`), 'confirm must not surface an error').toHaveCount(0);
    expect(await sellerOrderStatus(request, id)).toBe('confirmed');

    // …and shows up under "Đã xác nhận" with the next step offered.
    await page.getByRole('button', { name: 'Đã xác nhận', exact: true }).click();
    await expect(page.getByTestId(`seller-order-${id}`).getByRole('button', { name: 'Sẵn sàng giao' })).toBeVisible();
  });

  test('"Sẵn sàng giao" hands the order to GHN, or says why it could not', async ({ page, request }) => {
    const order = (await listSellerOrders(request, 'confirmed')).find(actionable);
    test.skip(!order, 'Shop has no actionable confirmed order to hand off');
    const id = order!.id;

    await openTab(page, 'confirmed');
    const card = page.getByTestId(`seller-order-${id}`);
    await card.getByRole('button', { name: 'Sẵn sàng giao' }).click();

    // Contract (sellerOrderActionError.ts): success moves the order to
    // `processing`; a GHN failure (400 bad address / 500 upstream) leaves it
    // `confirmed` and names the order in an error banner. Never silent.
    const failed = page.getByText(`#${id} ·`);
    await expect
      .poll(async () => (await card.count()) === 0 || (await failed.count()) > 0, {
        message: 'ready-to-ship must either move the order on or surface an error',
        timeout: 15_000,
      })
      .toBe(true);

    const status = await sellerOrderStatus(request, id);
    if ((await failed.count()) > 0) {
      expect(status, 'a failed hand-off must leave the order confirmed').toBe('confirmed');
    } else {
      expect(status, 'the order left the confirmed tab, so it must be processing').toBe('processing');
    }
  });
});
