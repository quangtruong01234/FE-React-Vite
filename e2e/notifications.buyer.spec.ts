import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { ACCOUNTS, ADMIN_ACCOUNT } from './accounts';
import { createPost, deletePost, likePost, markNotificationRead, postNotificationIds } from './api';

// Deep flow for `/notifications` (SOCIAL-LIKE-NTF-01): likes on one post are
// aggregated into ONE unread row that the backend re-pushes over the socket
// with the same id. The open page must render it as "Lượt thích mới", replace
// it in place on the second like (no duplicate row, moved to the top), and
// leave the unread badge at +1.
//
// Seeds its own data: the buyer writes a throwaway `[E2E]` post, the shop and
// admin accounts like it. Cleanup deletes the post and marks the row read so
// the buyer's badge is not left inflated.

let buyer: APIRequestContext;
let shop: APIRequestContext;
let admin: APIRequestContext | null = null;

test.beforeAll(async ({ playwright, baseURL }) => {
  buyer = await playwright.request.newContext({ baseURL, storageState: 'e2e/.auth/buyer.json' });
  shop = await playwright.request.newContext({ baseURL, storageState: 'e2e/.auth/shop.json' });
  if (ADMIN_ACCOUNT) {
    admin = await playwright.request.newContext({ baseURL, storageState: 'e2e/.auth/admin.json' });
  }
});

test.afterAll(async () => {
  await buyer.dispose();
  await shop.dispose();
  await admin?.dispose();
});

/** The header bell's unread badge; null when it reads "99+" and cannot be compared. */
async function unreadBadge(page: Page): Promise<number | null> {
  const badge = page.getByRole('button', { name: 'Thông báo', exact: true }).locator('span');
  if ((await badge.count()) === 0) return 0;
  const text = (await badge.innerText()).trim();
  return text === '99+' ? null : Number(text);
}

test('likes on one post collapse into one live-updated row', async ({ page }) => {
  test.skip(!admin, 'Needs a second liker — set E2E_ADMIN_* in e2e/.env.local');
  const secondLiker = admin;
  const adminName = ADMIN_ACCOUNT?.username;
  if (!secondLiker || !adminName) return;

  const postId = await createPost(buyer, `[E2E] like notification ${Date.now()}`);
  test.skip(!postId, 'Could not seed a post as the buyer account');
  if (!postId) return;

  const socketOpen = page.waitForEvent('websocket', (ws) => ws.url().includes('socket.io'));
  await page.goto('/notifications');
  await socketOpen;
  await expect(page.getByRole('button', { name: 'Tất cả', exact: true })).toBeVisible();
  const badgeBefore = await unreadBadge(page);

  let ntfId: string | undefined;
  try {
    expect(await likePost(shop, postId), 'first like').toBe(true);
    await expect.poll(async () => (await postNotificationIds(buyer, postId, 'like')).length).toBe(1);
    ntfId = (await postNotificationIds(buyer, postId, 'like'))[0];

    const row = page.getByTestId(`notification-${ntfId}`);
    await expect(row, 'the socket push renders the row without a reload').toContainText('Lượt thích mới');
    await expect(row).toContainText(`@${ACCOUNTS.shop.username} đã thích bài viết của bạn.`);
    if (badgeBefore !== null) await expect.poll(() => unreadBadge(page)).toBe(badgeBefore + 1);

    expect(await likePost(secondLiker, postId), 'second like').toBe(true);
    await expect(row, 'same id is replaced in place with the latest liker + count')
      .toContainText(`@${adminName} và 1 người khác đã thích bài viết của bạn.`);
    await expect(row).toHaveCount(1);
    await expect(
      page.locator('[data-testid^="notification-"]').first(),
      'the re-pushed row moves to the top',
    ).toHaveAttribute('data-testid', `notification-${ntfId}`);
    expect(await postNotificationIds(buyer, postId, 'like'), 'still one row server-side').toEqual([ntfId]);
    if (badgeBefore !== null) await expect.poll(() => unreadBadge(page)).toBe(badgeBefore + 1);
  } finally {
    if (ntfId) await markNotificationRead(buyer, ntfId);
    await deletePost(buyer, postId);
  }
});
