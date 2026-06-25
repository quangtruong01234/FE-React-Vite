import { test, expect } from '@playwright/test';
import { ACCOUNTS } from './accounts';
import { findOrder } from './orderApi';

// Covers audit items: BE-2 (cancel 503), FE-1 (silent cancel failure), UI-1 (raw
// pipe-delimited shipping address). Order *reads* work even while the write-path
// is down, so the UI-1 check runs today; the cancel check exercises BE-2/FE-1.

test.describe('Order detail — cancel & address rendering', () => {
  test('UI-1: shipping address is parsed, not raw pipe-delimited', async ({ page, request }) => {
    const order = await findOrder(request, ACCOUNTS.buyer.userId, () => true);
    test.skip(!order, 'No orders for buyer to inspect');

    await page.goto(`/order/${order!.id}`);
    await expect(page.getByRole('heading', { name: new RegExp(`Đơn hàng #${order!.id}`) })).toBeVisible();

    // Bug UI-1: address renders verbatim as "name|phone|street|ward|district|city".
    // Correct behavior: no pipe-delimited blob visible. Fails until parsed.
    await expect(
      page.getByText(/[^|]+\|\d{6,}\|/),
      'shipping address should be formatted, not raw pipe string',
    ).toHaveCount(0);
  });

  test('BE-2 + FE-1: cancelling a pending order gives visible feedback', async ({ page, request }) => {
    const pending = await findOrder(request, ACCOUNTS.buyer.userId, (o) => o.status === 'pending');
    test.skip(!pending, 'No pending order available to cancel');

    await page.goto(`/order/${pending!.id}`);
    const cancelBtn = page.getByRole('button', { name: /Hủy đơn/ });
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    // Correct behavior: EITHER the order moves to "Đã hủy", OR (on failure) a
    // visible error toast/message appears. Bug FE-1: on the 503 nothing renders.
    const cancelled = page.getByText(/Đã hủy|Đơn đã hủy|hủy thành công/i);
    const errorMsg = page.getByText(/không thể|thất bại|lỗi|thử lại/i);
    await expect(
      cancelled.or(errorMsg).first(),
      'cancel must surface success or an error — not fail silently',
    ).toBeVisible({ timeout: 8_000 });
  });
});
