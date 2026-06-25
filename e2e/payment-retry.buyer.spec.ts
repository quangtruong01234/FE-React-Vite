import { test, expect } from '@playwright/test';
import { ACCOUNTS } from './accounts';
import { findOrder } from './orderApi';

// Covers FE-2: re-paying a pending online order via "Thanh toán ngay" must land
// on the live gateway QR/checkout — NOT the VNPay "Giao dịch đã quá thời gian chờ
// thanh toán" (Error code 15) page caused by reusing the original vnp_CreateDate.
//
// Needs: a pending order with paymentMethod zalopay|vnpay (ideally freshly
// created, so the gateway window is still open). Currently fails on stale orders.

test.describe('Re-pay pending order → gateway', () => {
  test('FE-2: "Thanh toán ngay" reaches gateway, not the expired page', async ({ page, request }) => {
    const order = await findOrder(
      request,
      ACCOUNTS.buyer.userId,
      (o) => o.status === 'pending' && (o.paymentMethod === 'vnpay' || o.paymentMethod === 'zalopay'),
    );
    test.skip(!order, 'No pending online-payment order to retry');

    await page.goto(`/order/${order!.id}`);
    const payNow = page.getByRole('button', { name: 'Thanh toán ngay' });
    await expect(payNow).toBeVisible();

    await payNow.click();
    // FE redirects via window.location.href to the gateway origin.
    await page.waitForURL(/vnpayment\.vn|zalopay|sandbox/, { timeout: 15_000 });

    expect(page.url(), 'should not be the VNPay expired/error page').not.toContain('Error.html');
    await expect(
      page.getByText(/quá thời gian chờ thanh toán/),
      'gateway must not reject the order as expired',
    ).toHaveCount(0);
  });
});
