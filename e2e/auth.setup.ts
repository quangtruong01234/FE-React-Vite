import { test as setup, expect } from '@playwright/test';
import { ACCOUNTS, type Account } from './accounts';

// Logs in through the real LoginPage UI and persists the `access_token` cookie
// to a storageState file each role-scoped project reuses.
async function login(account: Account, statePath: string, page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/login');
  await page.locator('#username').fill(account.username);
  await page.locator('#password').fill(account.password);
  await page.getByRole('button', { name: /Đăng nhập/ }).click();

  // LoginPage navigates to `/` (or `?next=`) on success. Wait for the app shell,
  // not the login form, to confirm the cookie was set.
  await expect(page).toHaveURL(/\/($|\?|marketplace|sell)/, { timeout: 15_000 });
  await page.context().storageState({ path: statePath });
}

setup('authenticate buyer', async ({ page }) => {
  await login(ACCOUNTS.buyer, 'e2e/.auth/buyer.json', page);
});

setup('authenticate shop', async ({ page }) => {
  await login(ACCOUNTS.shop, 'e2e/.auth/shop.json', page);
});
