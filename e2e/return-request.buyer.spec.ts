import { test, expect, type APIRequestContext } from '@playwright/test';
import {
  listMyReturnRequests,
  listOrders,
  orderStatus,
  rejectReturnRequest,
  sellerOrderIds,
} from './api';

// Deep flow for `/returns` (and the return panel on `/order/:id`): a buyer opens
// a return request on a completed order, sees it pending on the order, then
// finds it in "Yêu cầu trả hàng".
//
// Writes real data, but leaves none behind: the order is picked from the shop
// account's own orders so the shop can reject the request afterwards, which
// restores the order to `completed` (the buyer may request again). Never approve
// — that is a one-way refund.

let shop: APIRequestContext;

test.beforeAll(async ({ playwright, baseURL }) => {
  shop = await playwright.request.newContext({ baseURL, storageState: 'e2e/.auth/shop.json' });
});

test.afterAll(async () => {
  await shop.dispose();
});

test('a buyer requests a return on a completed order and finds it under /returns', async ({
  page,
  request,
}) => {
  const shopCompleted = await sellerOrderIds(shop, 'completed');
  const order = (await listOrders(request)).find(
    (o) => o.status === 'completed' && shopCompleted.has(o.id),
  );
  test.skip(!order, 'Buyer has no completed order from the shop account to return');
  const id = order!.id;
  const reason = `[E2E] return-request ${Date.now()}`;

  try {
    await page.goto(`/order/${id}`);
    await page.getByRole('button', { name: 'Yêu cầu trả hàng' }).click();
    await page.getByPlaceholder('Lý do trả hàng (bắt buộc)').fill(reason);
    await page.getByRole('button', { name: 'Gửi yêu cầu' }).click();

    // The order parks at `return_requested`; the panel shows the pending request
    // and the entry button is gone (one active request per order).
    await expect(page.getByText(`Lý do: ${reason}`)).toBeVisible();
    await expect(page.getByText('Chờ duyệt', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Yêu cầu trả hàng' })).toHaveCount(0);
    expect(await orderStatus(request, id)).toBe('return_requested');

    const created = (await listMyReturnRequests(request)).find((r) => r.reason === reason);
    expect(created, 'the request must be in the buyer\'s own list').toBeDefined();

    await page.goto('/returns');
    const card = page.getByTestId(`return-request-${created!.id}`);
    await expect(card.getByRole('link', { name: `Đơn #${id}` })).toBeVisible();
    await expect(card.getByText('Chờ duyệt', { exact: true })).toBeVisible();
    await expect(card.getByText(`Lý do: ${reason}`)).toBeVisible();
  } finally {
    const open = (await listMyReturnRequests(request)).find(
      (r) => r.reason === reason && r.status === 'pending_review',
    );
    if (open) await rejectReturnRequest(shop, open.id, '[E2E] cleanup');
  }
  expect(await orderStatus(request, id), 'cleanup must restore the order').toBe('completed');
});
