import { test, expect, type APIRequestContext } from '@playwright/test';
import { chatMessageIdByContent, conversationWith, currentUserId, deleteChatMessage } from './api';

// Deep flow for `/messages`: the buyer opens a chat with the shop from its
// profile, sends a message over the socket, and still sees it after a reload
// (it was persisted, not just echoed optimistically).
//
// The message is hard-deleted in `finally` with the buyer's own session
// (CHAT-E2E-CLEANUP-01 — only the sender may delete), so the shop's inbox does
// not fill up with `[E2E]` chatter. The conversation itself is left in place:
// there is no route to delete one, and reusing it keeps every run idempotent.

const E2E_TAG = '[E2E]';

let shop: APIRequestContext;

test.beforeAll(async ({ playwright, baseURL }) => {
  shop = await playwright.request.newContext({ baseURL, storageState: 'e2e/.auth/shop.json' });
});

test.afterAll(async () => {
  await shop.dispose();
});

test('a sent message is persisted and survives a reload', async ({ page, request }) => {
  const shopId = await currentUserId(shop);
  test.skip(!shopId, 'Could not resolve the shop account id');
  const content = `${E2E_TAG} chat ${Date.now()}`;

  try {
    // Entry point a buyer actually uses: "Nhắn tin" on the shop's profile.
    await page.goto(`/profile/${shopId}`);
    await page.getByRole('button', { name: 'Nhắn tin' }).click();
    await expect(page).toHaveURL(/\/messages$/);

    const input = page.getByPlaceholder('Nhắn tin…');
    await input.fill(content);
    await input.press('Enter');

    // The bubble also holds its timestamp, so match it by containment.
    const bubble = page.getByTestId('chat-message').filter({ hasText: content });
    await expect(bubble).toBeVisible();
    await expect(page.getByText('Gửi thất bại'), 'the socket send must not fail').toHaveCount(0);
    await expect(page.getByText('Đã gửi')).toBeVisible();

    // Reload drops the selection and the optimistic cache: what comes back is
    // the server's copy. The list preview shows the buyer's own last message…
    await page.reload();
    const row = page.getByRole('button').filter({ hasText: `Bạn: ${content}` });
    await expect(row).toBeVisible();
    // …and opening the thread shows the message itself.
    await row.click();
    await expect(bubble).toBeVisible();
  } finally {
    const conversationId = shopId ? await conversationWith(request, shopId) : null;
    const messageId = conversationId
      ? await chatMessageIdByContent(request, conversationId, content)
      : null;
    if (conversationId && messageId) {
      expect(await deleteChatMessage(request, messageId), 'sender cleanup must succeed').toBe(true);
      expect(await chatMessageIdByContent(request, conversationId, content)).toBeNull();
    }
  }
});
