import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { ACCOUNTS, ADMIN_ACCOUNT } from './accounts';
import { userRoleByUsername } from './api';

// Deep flow for `/admin` and `/admin/analytics`:
// - the users table: search narrows it to one account, the role control asks
//   before it writes (and a cancel writes nothing), and the admin's own row is
//   locked;
// - the analytics filters actually reach the request, and the whole-platform
//   CSV export downloads a file.
//
// Read-only against real data: the role pick is always cancelled (checked
// against the API), and the export only downloads — no background job.

test.describe('Admin overview — users table', () => {
  test('search finds one account, and a role pick is confirmed before it writes', async ({ page, request }) => {
    const { username, role } = ACCOUNTS.buyer;
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Quản trị sàn' })).toBeVisible();

    await page.getByRole('searchbox', { name: 'Tìm người dùng theo username, email hoặc tên' }).fill(username);
    const usersTable = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'Vai trò' }) });
    const dataRows = usersTable.getByRole('row').filter({ has: page.getByRole('cell') });
    await expect(dataRows).toHaveCount(1);
    const row = dataRows.filter({ hasText: username });
    await expect(row).toBeVisible();

    const roleSelect = row.getByRole('combobox', { name: `Vai trò của ${username}` });
    await expect(roleSelect).toHaveValue(role);
    await roleSelect.selectOption('shop');

    // The pick only opens the confirm; cancelling leaves the account as it was.
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/^Đổi vai trò của .+ thành "/)).toBeVisible();
    await expect(dialog.getByText('Người dùng cần đăng xuất và đăng nhập lại để vai trò mới có hiệu lực.')).toBeVisible();
    await dialog.getByRole('button', { name: 'Hủy' }).click();
    await expect(dialog).toBeHidden();
    await expect(roleSelect).toHaveValue(role);
    expect(await userRoleByUsername(request, username)).toBe(role);
  });

  test("the admin's own row cannot change its role", async ({ page }) => {
    test.skip(ADMIN_ACCOUNT === null, 'admin credentials unset');
    if (ADMIN_ACCOUNT === null) return;
    await page.goto('/admin');
    await page.getByRole('searchbox', { name: 'Tìm người dùng theo username, email hoặc tên' }).fill(ADMIN_ACCOUNT.username);
    const usersTable = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'Vai trò' }) });
    const row = usersTable.getByRole('row').filter({ hasText: ADMIN_ACCOUNT.username });
    await expect(row).toHaveCount(1);
    await expect(row.getByRole('combobox')).toHaveCount(0);
    await expect(row.getByTitle('Không thể tự đổi vai trò của mình')).toBeVisible();
  });
});

test.describe('Admin analytics — filters and export', () => {
  test('the range and interval buttons drive the analytics request', async ({ page }) => {
    const analytics = (pred: (url: URL) => boolean) =>
      page.waitForResponse((res) => {
        const url = new URL(res.url());
        return url.pathname.endsWith('/order/admin/analytics') && pred(url);
      });

    const initial = analytics((url) => url.searchParams.get('interval') === 'day' && !url.searchParams.has('from'));
    await page.goto('/admin/analytics');
    await expect(page.getByRole('heading', { name: 'Thống kê toàn sàn', level: 1 })).toBeVisible();
    expect((await initial).ok()).toBe(true);
    const trendCard = page.getByText('Doanh thu theo thời gian').locator('..');
    await expect(trendCard.getByText('Theo ngày', { exact: true })).toBeVisible();

    const monthly = analytics((url) => url.searchParams.get('interval') === 'month');
    await page.getByRole('button', { name: 'Theo tháng' }).click();
    expect((await monthly).ok()).toBe(true);
    await expect(trendCard.getByText('Theo tháng', { exact: true })).toBeVisible();

    // A preset sends an explicit window; the default button takes it away again.
    const week = analytics((url) => url.searchParams.has('from') && url.searchParams.has('to'));
    await page.getByRole('button', { name: '7 ngày', exact: true }).click();
    const weekUrl = new URL((await week).url());
    const from = Date.parse(weekUrl.searchParams.get('from') ?? '');
    const to = Date.parse(weekUrl.searchParams.get('to') ?? '');
    expect((to - from) / 86_400_000).toBe(6);
    expect(weekUrl.searchParams.get('interval')).toBe('month');

    // The default window is already cached from the first load, so no request
    // need fire — the charts just have to come back without an error.
    await page.getByRole('button', { name: '30 ngày (mặc định)' }).click();
    await expect(page.getByText('Tổng đơn', { exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('the platform export downloads a CSV for the default window', async ({ page }) => {
    await page.goto('/admin/analytics');
    const exportSection = page.getByRole('region', { name: 'Xuất đơn hàng (CSV)' });
    await expect(exportSection).toBeVisible();

    const download = page.waitForEvent('download');
    await exportSection.getByRole('button', { name: 'Xuất CSV' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^trybuy-orders-all-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}\.csv$/);
    const path = await file.path();
    const csv = await readFile(path, 'utf8');
    // At least the header row, comma-separated.
    expect(csv.split('\n')[0]).toContain(',');
  });
});
