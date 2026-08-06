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

// The shape `/order/:id` accepts. The gateway does NOT send this yet — it sends
// the internal numeric id (see backend-handoff.md) — so the numeric cases below
// are what really happens today, and the public-id cases are the contract this
// page is written against and will start satisfying with no FE change.
const PUBLIC_ORDER_ID = 'ord_516a9c38816611f1';

test.describe('PaymentResultPage render', () => {
  test('success + public order id → confirmation deep-links to the order', async ({ page }) => {
    await mockGateway(page, 'success');
    await page.goto(
      `/payment-result?order=${PUBLIC_ORDER_ID}&method=vnpay&vnp_TxnRef=abc&vnp_ResponseCode=00`,
    );

    await expect(page.getByRole('heading', { name: 'Thanh toán thành công!' })).toBeVisible();
    await expect(page.getByText(`#${PUBLIC_ORDER_ID}`)).toBeVisible();
    await expect(page.getByRole('link', { name: /Xem chi tiết đơn hàng/ })).toHaveAttribute(
      'href',
      `/order/${PUBLIC_ORDER_ID}`,
    );
  });

  test('success + numeric order id → order list, never a dead deep link', async ({ page }) => {
    // Regression guard: `/order/111` 400s at the API ("Invalid id — expected
    // format ord_<16 alphanumeric characters>") and renders "Không tìm thấy đơn
    // hàng.". Offering that link was the bug; the list is the correct fallback.
    await mockGateway(page, 'success');
    await page.goto('/payment-result?order=111&method=vnpay&vnp_TxnRef=abc&vnp_ResponseCode=00');

    await expect(page.getByRole('heading', { name: 'Thanh toán thành công!' })).toBeVisible();
    await expect(page.getByText('#111')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Xem đơn hàng của tôi/ })).toHaveAttribute(
      'href',
      '/orders',
    );
    await expect(page.locator('a[href="/order/111"]')).toHaveCount(0);
  });

  test('failure + public order id → retry affordances', async ({ page }) => {
    await mockGateway(page, 'failed');
    await page.goto(`/payment-result?order=${PUBLIC_ORDER_ID}&method=zalopay`);

    await expect(page.getByRole('heading', { name: 'Thanh toán thất bại' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Quay lại đơn hàng/ })).toHaveAttribute(
      'href',
      `/order/${PUBLIC_ORDER_ID}`,
    );
    await expect(page.getByRole('link', { name: /Xem tất cả đơn hàng/ })).toBeVisible();
  });

  test('failure + numeric order id → only the order-list escape hatch', async ({ page }) => {
    await mockGateway(page, 'failed');
    await page.goto('/payment-result?order=111&method=zalopay');

    await expect(page.getByRole('heading', { name: 'Thanh toán thất bại' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Quay lại đơn hàng/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Xem tất cả đơn hàng/ })).toBeVisible();
  });
});
