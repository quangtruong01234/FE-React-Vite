import { test, expect } from '@playwright/test';

// Covers the success / cancelled RENDER paths of PaymentResultPage in isolation.
// The gateway confirmation call (GET /api/gateway/payment-result) is mocked, so
// these run today regardless of backend write-path health. The real end-to-end
// success/cancel (BE-1, FE-2) lives in payment-retry.buyer.spec.ts.

function mockGateway(page: import('@playwright/test').Page, status: string): Promise<void> {
  return page.route('**/api/gateway/payment-result*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 200, status: 'success', message: 'ok', data: { status } }),
    });
  });
}

test.describe('PaymentResultPage render', () => {
  test('success → confirmation + order link', async ({ page }) => {
    await mockGateway(page, 'success');
    await page.goto('/payment-result?order=999&method=vnpay&vnp_TxnRef=abc&vnp_ResponseCode=00');

    await expect(page.getByRole('heading', { name: 'Thanh toán thành công!' })).toBeVisible();
    await expect(page.getByText(/#999/)).toBeVisible();
    await expect(page.getByRole('link', { name: /Xem chi tiết đơn hàng/ })).toHaveAttribute(
      'href',
      '/order/999',
    );
  });

  test('failure → retry affordances', async ({ page }) => {
    await mockGateway(page, 'failed');
    await page.goto('/payment-result?order=999&method=zalopay');

    await expect(page.getByRole('heading', { name: 'Thanh toán thất bại' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Quay lại đơn hàng/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Xem tất cả đơn hàng/ })).toBeVisible();
  });
});
