import { test, expect, type Page } from '@playwright/test';
import { ACCOUNTS, type Account } from './accounts';

// AUTH-STALE-01 — `currentUser` from `useAuthContext()` must follow an in-app
// login/logout without a reload. `ProfilePage` derives `isMe` from the context
// (not from the `auth.me` query), so "Sửa hồ sơ" on your own profile is the
// observable: a stale context shows "Theo dõi" there instead.
//
// Starts signed out and never reloads the tab — a reload would re-seed the
// provider and hide the bug.
test.use({ storageState: { cookies: [], origins: [] } });

async function loginViaForm(page: Page, account: Account): Promise<void> {
  await page.locator('#username').fill(account.username);
  await page.locator('#password').fill(account.password);
  await page.getByRole('button', { name: /Đăng nhập/ }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

async function openOwnProfile(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Menu tài khoản' }).click();
  await page.getByRole('button', { name: 'Trang cá nhân' }).click();
  await expect(page).toHaveURL(/\/profile\/usr_/);
}

test('context session follows login → logout → login as another account in one tab', async ({ page }) => {
  await page.goto('/login');

  await loginViaForm(page, ACCOUNTS.buyer);
  await openOwnProfile(page);
  const buyerProfileUrl = page.url();
  await expect(page.getByRole('button', { name: 'Sửa hồ sơ' })).toBeVisible();

  await page.getByRole('button', { name: 'Menu tài khoản' }).click();
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page).toHaveURL(/\/login/);

  await loginViaForm(page, ACCOUNTS.shop);
  await openOwnProfile(page);
  expect(page.url()).not.toBe(buyerProfileUrl);
  await expect(page.getByRole('button', { name: 'Sửa hồ sơ' })).toBeVisible();

  // Client-side hop to the buyer's profile (pushState + popstate, which the
  // router listens to — `page.goto` would reload). The old session must be
  // gone, so this is now someone else's profile.
  await page.evaluate((url) => {
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, buyerProfileUrl);
  await expect(page).toHaveURL(buyerProfileUrl);
  // Header loaded (follow/unfollow depends on seed data, so assert neither).
  await expect(page.getByRole('button', { name: /^\d+ đang theo dõi$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sửa hồ sơ' })).toHaveCount(0);
});
