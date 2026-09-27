import { test, expect, type Page } from '@playwright/test';

// THEME-06 — the theme a visitor picks survives a reload, and it wins over the OS setting.
// Signed out on /login (its ThemeToggleButton); ProfileMenu's switch writes the same key.
// The OS is pinned to dark so "light after reload" can only come from the saved choice.
test.use({ colorScheme: 'dark' });

const html = (page: Page) => page.locator('html');
const themeColor = (page: Page) => page.locator('meta[name="theme-color"]');

test('light theme picked on /login is still there after a reload', async ({ page }) => {
  await page.goto('/login');
  await expect(html(page)).toHaveAttribute('data-theme', 'dark');

  await page.getByRole('button', { name: 'Chuyển sang giao diện sáng' }).click();
  await expect(html(page)).toHaveAttribute('data-theme', 'light');
  await expect(themeColor(page)).toHaveAttribute('content', '#FAFAFA');

  await page.reload();
  await expect(html(page)).toHaveAttribute('data-theme', 'light');
  await expect(themeColor(page)).toHaveAttribute('content', '#FAFAFA');
  await expect(page.getByRole('button', { name: 'Chuyển sang giao diện tối' })).toBeVisible();

  // Back to dark, which must stick as well.
  await page.getByRole('button', { name: 'Chuyển sang giao diện tối' }).click();
  await page.reload();
  await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  await expect(themeColor(page)).toHaveAttribute('content', '#09090B');
});

test('the saved theme is set before the app boots (no dark flash)', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Chuyển sang giao diện sáng' }).click();
  await expect(html(page)).toHaveAttribute('data-theme', 'light');

  // With the app bundle blocked, only index.html's pre-paint script can set the theme.
  await page.route('**/src/main.*', (route) => route.abort());
  await page.reload();
  await expect(html(page)).toHaveAttribute('data-theme', 'light');
  await expect(themeColor(page)).toHaveAttribute('content', '#FAFAFA');
  await expect(page.getByRole('button', { name: 'Chuyển sang giao diện tối' })).toHaveCount(0);
});
