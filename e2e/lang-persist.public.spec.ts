import { test, expect, type Page } from '@playwright/test';

// I18N-01 — the language a visitor picks survives a reload. Signed out on /login (its
// LanguageSwitch); ProfileMenu's switch writes the same `tb-lang` key.
// The browser is pinned to English so "vi on first visit" proves the default ignores it.
test.use({ locale: 'en-US' });

const html = (page: Page) => page.locator('html');

test('Vietnamese by default, English picked on /login is still there after a reload', async ({ page }) => {
  await page.goto('/login');
  await expect(html(page)).toHaveAttribute('lang', 'vi');
  await expect(page.getByRole('radio', { name: 'Tiếng Việt' })).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('radio', { name: 'English' }).click();
  await expect(html(page)).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('button', { name: /^Switch to (light|dark) theme$/ })).toBeVisible();

  await page.reload();
  await expect(html(page)).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('radio', { name: 'English' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radiogroup', { name: 'Language' })).toBeVisible();

  // Back to Vietnamese, which must stick as well.
  await page.getByRole('radio', { name: 'Tiếng Việt' }).click();
  await page.reload();
  await expect(html(page)).toHaveAttribute('lang', 'vi');
  await expect(page.getByRole('button', { name: /^Chuyển sang giao diện (sáng|tối)$/ })).toBeVisible();
});

test('the saved language is set on <html> before the app boots', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('radio', { name: 'English' }).click();
  await expect(html(page)).toHaveAttribute('lang', 'en');

  // With the app bundle blocked, only index.html's pre-paint script can set it.
  await page.route('**/src/main.*', (route) => route.abort());
  await page.reload();
  await expect(html(page)).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('radiogroup')).toHaveCount(0);
});
