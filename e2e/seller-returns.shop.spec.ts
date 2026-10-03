import { test, expect, type APIRequestContext } from '@playwright/test';
import {
  listOrders,
  listReturnQueue,
  requestReturn,
  sellerOrderIds,
  sellerOrderStatus,
  type ReturnRequestRow,
} from './api';

// Deep flow for `/sell/returns`: the seller rejects a pending return request
// with a reason; the order is restored and the request moves to "Từ chối".
//
// Only the reject branch is exercised. It is self-restoring (the order goes back
// to `completed`, the buyer may request again); approve is a one-way refund and
// would burn a completed order per run. Only `[E2E]`-tagged requests are touched
// — a real buyer's pending request is never reviewed by the suite.

const E2E_TAG = '[E2E]';

let buyer: APIRequestContext;

test.beforeAll(async ({ playwright, baseURL }) => {
  buyer = await playwright.request.newContext({ baseURL, storageState: 'e2e/.auth/buyer.json' });
});

test.afterAll(async () => {
  await buyer.dispose();
});

// Reuse a leftover `[E2E]` request, else seed one on a completed order the
// buyer account placed with this shop.
async function pendingE2eRequest(shop: APIRequestContext): Promise<ReturnRequestRow | null> {
  const leftover = (await listReturnQueue(shop, 'pending_review')).find((r) =>
    r.reason.startsWith(E2E_TAG),
  );
  if (leftover) return leftover;

  const shopCompleted = await sellerOrderIds(shop, 'completed');
  const order = (await listOrders(buyer)).find(
    (o) => o.status === 'completed' && shopCompleted.has(o.id),
  );
  if (!order) return null;
  return requestReturn(buyer, order.id, `${E2E_TAG} seller-returns ${Date.now()}`);
}

test('rejecting a pending return restores the order and files it under "Từ chối"', async ({
  page,
  request,
}) => {
  const pending = await pendingE2eRequest(request);
  test.skip(!pending, 'No pending [E2E] request and no completed buyer order to seed one on');
  const { id, orderId } = pending!;
  const rejectReason = `${E2E_TAG} reject ${Date.now()}`;

  await page.goto('/sell/returns');
  await expect(page.getByRole('heading', { name: 'Yêu cầu trả hàng' })).toBeVisible();
  const card = page.getByTestId(`seller-return-${id}`);
  await expect(card.getByRole('link', { name: `Đơn #${orderId}` })).toBeVisible();

  // The reason is required — confirm stays disabled until one is typed.
  await card.getByRole('button', { name: 'Từ chối', exact: true }).click();
  const confirm = card.getByRole('button', { name: 'Xác nhận từ chối' });
  await expect(confirm).toBeDisabled();
  await card.getByPlaceholder('Lý do từ chối (bắt buộc)').fill(rejectReason);
  await confirm.click();

  await expect(card, 'a rejected request should leave the "Chờ duyệt" tab').toHaveCount(0);
  await expect(page.getByText(`#${id} ·`), 'reject must not surface an error').toHaveCount(0);
  expect(await sellerOrderStatus(request, orderId), 'reject restores the previous status').toBe(
    'completed',
  );

  // The filter tab shares its label with each pending card's reject button; the
  // tab row renders above the list, so it is the first match.
  await page.getByRole('button', { name: 'Từ chối', exact: true }).first().click();
  await expect(page).toHaveURL(/status=rejected/);
  await expect(
    page.getByTestId(`seller-return-${id}`).getByText(`Đã từ chối: ${rejectReason}`),
  ).toBeVisible();
});
