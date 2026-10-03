import { test, expect } from '@playwright/test';
import { createPost, deletePost, postState } from './api';

// Deep flow for `/post/:id`: the like toggle reaches the server and is still
// on after a reload, a comment posts, and the owner's delete lands back on the
// feed (`/`) with the post gone.
//
// Works on a post this spec creates itself, so nobody else's counts move; the
// delete runs through the UI, and `finally` removes the post if a step failed
// before it.

test.describe('Post detail — /post/:id', () => {
  test('like survives a reload, a comment posts, and delete returns to the feed', async ({ page, request }) => {
    const content = `[E2E] post-detail ${Date.now()}`;
    const postId = await createPost(request, content);
    test.skip(postId === null, 'could not create a post for the buyer');
    if (postId === null) return;

    try {
      await page.goto(`/post/${postId}`);
      await expect(page.getByText(content)).toBeVisible();

      // Like — the button reports its state and the server agrees.
      const like = page.getByRole('button', { name: 'Thích' });
      await expect(like).toHaveAttribute('aria-pressed', 'false');
      await like.click();
      await expect(like).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(async () => (await postState(request, postId))?.isLiked).toBe(true);

      // The page used to forget the like on load and offer it again.
      await page.reload();
      await expect(page.getByText(content)).toBeVisible();
      await expect(like).toHaveAttribute('aria-pressed', 'true');
      expect((await postState(request, postId))?.likeCount).toBe(1);

      await like.click();
      await expect(like).toHaveAttribute('aria-pressed', 'false');
      await expect.poll(async () => (await postState(request, postId))?.isLiked).toBe(false);

      // Comment through the named send button.
      await expect(page.getByText('Chưa có bình luận. Hãy là người đầu tiên!')).toBeVisible();
      const comment = `[E2E] comment ${Date.now()}`;
      const input = page.getByPlaceholder('Viết bình luận…');
      await input.fill(comment);
      await page.getByRole('button', { name: 'Gửi bình luận' }).click();
      await expect(page.getByText(comment)).toBeVisible();
      await expect(input).toHaveValue('');
      await expect.poll(async () => (await postState(request, postId))?.commentCount).toBe(1);

      // Delete through the owner menu: asks first, then hands back to the feed.
      await page.getByRole('button', { name: 'Tùy chọn bài viết' }).click();
      await page.getByRole('button', { name: 'Xóa bài viết' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('Hành động này không thể hoàn tác.')).toBeVisible();
      await dialog.getByRole('button', { name: 'Xóa bài viết' }).click();
      await expect(page).toHaveURL('/');
      await expect.poll(async () => postState(request, postId)).toBeNull();
      await expect(page.getByText(content)).toHaveCount(0);
    } finally {
      await deletePost(request, postId);
    }
  });
});
