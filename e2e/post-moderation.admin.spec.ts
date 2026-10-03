import { test, expect, type APIRequestContext } from '@playwright/test';
import { createPost, deletePost, reportPost } from './api';

// Deep flow for `/admin/reports`: a reported post is hidden (its pending report
// resolves, so it moves from "Chờ xử lý" to "Đã xử lý"), then shown again.
//
// Seeds its own data and removes it: the buyer account writes a throwaway
// `[E2E]` post, the shop account reports it, and the buyer deletes it at the
// end. Dismiss/delete from the queue are not exercised — hide → unhide is the
// reversible pair.

let buyer: APIRequestContext;
let shop: APIRequestContext;

test.beforeAll(async ({ playwright, baseURL }) => {
  buyer = await playwright.request.newContext({ baseURL, storageState: 'e2e/.auth/buyer.json' });
  shop = await playwright.request.newContext({ baseURL, storageState: 'e2e/.auth/shop.json' });
});

test.afterAll(async () => {
  await buyer.dispose();
  await shop.dispose();
});

test('hiding a reported post resolves its report; unhide puts it back in the feed', async ({ page }) => {
  const stamp = Date.now();
  const postId = await createPost(buyer, `[E2E] moderation ${stamp}`);
  test.skip(!postId, 'Could not seed a post as the buyer account');
  const id = postId!;

  try {
    expect(await reportPost(shop, id, `[E2E] report ${stamp}`), 'seed report').toBe(true);

    await page.goto('/admin/reports');
    await expect(page.getByRole('heading', { name: 'Kiểm duyệt bài viết' })).toBeVisible();
    const card = page.getByTestId(`reported-post-${id}`);
    await expect(card.getByText('1 chờ xử lý')).toBeVisible();
    await expect(card.getByText(`[E2E] report ${stamp}`)).toBeVisible();

    await card.getByRole('button', { name: 'Ẩn bài viết' }).click();
    await expect(page.getByText(/Đã ẩn bài viết/)).toBeVisible();
    await expect(card, 'hide resolves the pending report — the post leaves the queue').toHaveCount(0);

    await page.getByRole('button', { name: 'Đã xử lý', exact: true }).click();
    await expect(page).toHaveURL(/status=resolved/);
    const resolved = page.getByTestId(`reported-post-${id}`);
    await expect(resolved.getByText('Đang ẩn khỏi feed')).toBeVisible();

    await resolved.getByRole('button', { name: 'Hiện lại' }).click();
    await expect(page.getByText(/Đã hiện lại bài viết/)).toBeVisible();
    await expect(resolved.getByText('Đang ẩn khỏi feed')).toHaveCount(0);
    await expect(resolved.getByRole('button', { name: 'Ẩn bài viết' })).toBeVisible();
  } finally {
    await deletePost(buyer, id);
  }
});
