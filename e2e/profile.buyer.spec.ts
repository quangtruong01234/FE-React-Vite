import { test, expect } from '@playwright/test';
import { buyableProduct, currentUserEmail, currentUserId, currentUserName, setUserName } from './api';

// Deep flow for `/profile/:id`: the owner edits their display name, a changed
// email asks for the password (EMAIL-REAUTH-01, refusing branches only), and a
// visitor follows / unfollows another account — each persisted, not just
// painted (checked against `/user/me`, or by reloading the page).
//
// Writes real data and puts it back: the display name is restored (finally),
// and the follow state ends where it started.

test.describe('Profile — edit and follow', () => {
  test('the owner renames themselves and the header follows', async ({ page, request }) => {
    const me = await currentUserId(request);
    const original = await currentUserName(request);
    test.skip(me === null || original === null, 'buyer has no display name to restore');
    if (me === null || original === null) return;
    const renamed = `E2E Buyer ${Date.now().toString(36)}`;

    try {
      await page.goto(`/profile/${me}`);
      await expect(page.getByRole('heading', { name: original })).toBeVisible();
      await page.getByRole('button', { name: 'Sửa hồ sơ' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByRole('heading', { name: 'Chỉnh sửa hồ sơ' })).toBeVisible();
      const nameInput = dialog.locator('input[name="name"]');
      await expect(nameInput).toHaveValue(original);
      await nameInput.fill(renamed);
      await dialog.getByRole('button', { name: 'Lưu thay đổi' }).click();
      await expect(dialog).toBeHidden();

      await expect(page.getByRole('heading', { name: renamed })).toBeVisible();
      expect(await currentUserName(request)).toBe(renamed);
    } finally {
      await setUserName(request, me, original);
    }
  });

  // EMAIL-REAUTH-01: a changed email needs the current password. Only the
  // refusing branches run here — a wrong password changes nothing and keeps the
  // session — so the seed account's email is never actually moved.
  test('changing the email asks for the password and a wrong one stays on the field', async ({ page, request }) => {
    const me = await currentUserId(request);
    const email = await currentUserEmail(request);
    test.skip(me === null || email === null, 'buyer has no email to compare against');
    if (me === null || email === null) return;

    await page.goto(`/profile/${me}`);
    await page.getByRole('button', { name: 'Sửa hồ sơ' }).click();
    const dialog = page.getByRole('dialog');
    const emailInput = dialog.locator('input[name="email"]');
    const password = dialog.getByLabel('Mật khẩu hiện tại');
    await expect(emailInput).toHaveValue(email);
    await expect(password).toHaveCount(0);

    // The field appears only while the email differs, and is required then.
    await emailInput.fill(`e2e-${Date.now().toString(36)}@example.com`);
    await expect(password).toBeVisible();
    await dialog.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(dialog.getByText('Nhập mật khẩu hiện tại để đổi email')).toBeVisible();

    // A wrong password is a 401 the session survives: the error sits on the
    // field, the dialog stays, and nothing bounces to /login.
    await password.fill(`wrong-${Date.now()}`);
    await dialog.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(dialog.getByText('Mật khẩu hiện tại không đúng.')).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(`/profile/${me}`);
    expect(await currentUserEmail(request)).toBe(email);

    // Putting the email back hides the field again.
    await emailInput.fill(email);
    await expect(password).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Hủy' }).click();
    await expect(dialog).toBeHidden();

    await page.reload();
    await expect(page).toHaveURL(`/profile/${me}`);
    await expect(page.getByRole('button', { name: 'Sửa hồ sơ' })).toBeVisible();
  });

  test('following another account counts once and survives a reload', async ({ page, request }) => {
    const seller = (await buyableProduct(request))?.sellerId ?? null;
    test.skip(seller === null, 'no other account with a product to visit');
    if (seller === null) return;

    await page.goto(`/profile/${seller}`);
    const followers = page.getByRole('button', { name: /người theo dõi/ });
    await expect(followers).toBeVisible();
    // The header's own pair — a tab and the rail's suggestions reuse the same words.
    const actions = page.getByRole('button', { name: 'Nhắn tin' }).locator('..');
    const followBtn = actions.getByRole('button', { name: 'Theo dõi', exact: true });
    const followingBtn = actions.getByRole('button', { name: 'Đang theo dõi' });
    await expect(followBtn.or(followingBtn)).toBeVisible();
    const startedFollowing = await followingBtn.isVisible();
    const count = async (): Promise<number> => Number.parseInt((await followers.innerText()).trim(), 10);
    const startCount = await count();

    // Flip, check it stuck on the server, then flip back.
    await (startedFollowing ? followingBtn : followBtn).click();
    const flipped = startedFollowing ? followBtn : followingBtn;
    await expect(flipped).toBeVisible();
    const delta = startedFollowing ? -1 : 1;
    await expect.poll(count).toBe(startCount + delta);

    await page.reload();
    await expect(flipped).toBeVisible();
    await expect.poll(count).toBe(startCount + delta);

    await flipped.click();
    await expect(startedFollowing ? followingBtn : followBtn).toBeVisible();
    await expect.poll(count).toBe(startCount);
  });
});
