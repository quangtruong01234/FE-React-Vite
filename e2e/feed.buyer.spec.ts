import { test, expect } from '@playwright/test';
import { deletePost, postIdByContent, postState } from './api';

// Deep flow for `/` (the feed): publish through the header composer → the
// search box finds the new card → like / unlike from the card → edit through
// the card menu → delete from the card menu, with every write checked
// against the API.
//
// Works on a post this spec creates, tagged `[E2E]`; the delete runs through
// the UI and `finally` removes the post if a step failed before it.

test.describe('Feed — /', () => {
  test('a post published from the composer can be found, liked, edited and deleted', async ({ page, request }) => {
    const stamp = Date.now().toString(36);
    const content = `[E2E] feed ${stamp}`;
    const edited = `[E2E] feed ${stamp} edited`;
    let postId: string | null = null;

    try {
      await page.goto('/');
      await page.getByRole('button', { name: 'Tạo bài viết' }).click();
      const composer = page.getByRole('dialog');
      await expect(composer.getByRole('heading', { name: 'Tạo bài viết' })).toBeVisible();
      await composer.getByPlaceholder('Chia sẻ điều gì đó về sản phẩm, review, deal hot…').fill(content);
      await composer.getByRole('button', { name: 'Đăng bài' }).click();
      await expect(composer).toBeHidden();
      await expect.poll(async () => (postId = await postIdByContent(request, content))).not.toBeNull();

      // The search box narrows the feed server-side to the new card.
      const search = page.getByPlaceholder('Tìm bài viết…');
      await search.fill(stamp);
      const card = page.getByRole('article').filter({ hasText: content });
      await expect(card).toHaveCount(1);
      await expect(page.getByRole('article')).toHaveCount(1);

      // Like / unlike from the card, each landing on the server.
      const like = card.getByRole('button', { name: 'Thích' });
      await expect(like).toHaveAttribute('aria-pressed', 'false');
      await like.click();
      await expect(like).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(async () => (postId === null ? null : (await postState(request, postId))?.isLiked)).toBe(true);
      await like.click();
      await expect(like).toHaveAttribute('aria-pressed', 'false');
      await expect.poll(async () => (postId === null ? null : (await postState(request, postId))?.isLiked)).toBe(false);

      // Edit opens the same composer, filled, and the card shows the new text.
      await card.getByRole('button', { name: 'Tùy chọn bài viết' }).click();
      await page.getByRole('button', { name: 'Chỉnh sửa bài viết' }).click();
      await expect(composer.getByRole('heading', { name: 'Chỉnh sửa bài viết' })).toBeVisible();
      const body = composer.getByPlaceholder('Chia sẻ điều gì đó về sản phẩm, review, deal hot…');
      await expect(body).toHaveValue(content);
      await body.fill(edited);
      await composer.getByRole('button', { name: 'Lưu', exact: true }).click();
      await expect(composer).toBeHidden();
      const editedCard = page.getByRole('article').filter({ hasText: edited });
      await expect(editedCard).toHaveCount(1);
      await expect.poll(async () => postIdByContent(request, edited)).toBe(postId);

      // Delete from the card menu: asks first, then the card leaves the feed.
      await editedCard.getByRole('button', { name: 'Tùy chọn bài viết' }).click();
      await page.getByRole('button', { name: 'Xóa bài viết' }).click();
      const confirm = page.getByRole('dialog');
      await expect(confirm.getByText('Hành động này không thể hoàn tác.')).toBeVisible();
      await confirm.getByRole('button', { name: 'Xóa bài viết' }).click();
      await expect(confirm).toBeHidden();
      await expect(editedCard).toHaveCount(0);
      await expect.poll(async () => (postId === null ? 'no id' : postState(request, postId))).toBeNull();
      await expect(page.getByText(`Không tìm thấy bài viết nào khớp “${stamp}”`)).toBeVisible();
    } finally {
      if (postId !== null) await deletePost(request, postId);
    }
  });
});
