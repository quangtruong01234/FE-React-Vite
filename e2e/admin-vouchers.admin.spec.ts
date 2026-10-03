import { test, expect, type Page } from '@playwright/test';
import { deactivateAdminVoucher, findAdminVoucher } from './api';

// Deep flow for `/admin/vouchers`: the platform voucher console
// (`VoucherConsole` + `ADMIN_VOUCHER_BINDING`) — create switched off → find it
// by search → switch on → switch off through the confirm modal, each step
// checked against the admin list API.
//
// Writes real data: each run leaves one new, deactivated platform voucher. It is
// created OFF so it is never live while the spec drives the form, and it is
// always switched off again (afterEach) — a platform code left on would be
// offered at every buyer's checkout.

let createdId: number | null = null;

test.afterEach(async ({ request }) => {
  if (createdId !== null) await deactivateAdminVoucher(request, createdId);
  createdId = null;
});

async function openConsole(page: Page): Promise<void> {
  await page.goto('/admin/vouchers');
  await expect(page.getByRole('heading', { name: 'Mã giảm giá', exact: true })).toBeVisible();
}

test.describe('Admin vouchers — platform code lifecycle', () => {
  test('a code created switched off is platform-wide, searchable and reversible', async ({ page, request }) => {
    const code = `E2E-ADM-${Date.now().toString(36).toUpperCase()}`;
    await openConsole(page);

    await page.getByRole('button', { name: 'Tạo mã mới' }).click();
    await page.locator('#voucher-code').fill(code);
    await page.locator('#voucher-description').fill('e2e platform voucher');
    await page.locator('#voucher-discount-value').fill('5');
    await page.locator('#voucher-usage-limit').fill('1');
    const activeNow = page.getByRole('switch', { name: 'Kích hoạt mã ngay sau khi tạo' });
    await expect(activeNow).toHaveAttribute('aria-checked', 'true');
    await activeNow.click();
    await expect(activeNow).toHaveAttribute('aria-checked', 'false');
    await page.getByRole('button', { name: 'Tạo mã', exact: true }).click();
    await expect(page.getByText(`Đã tạo mã ${code}.`)).toBeVisible();

    const created = await findAdminVoucher(request, code);
    expect(created, 'created code must be listed under /order/admin/vouchers').toBeDefined();
    createdId = created?.id ?? null;
    // The toggle reached the backend, and a platform code has no owner.
    expect(created?.isActive).toBe(false);
    expect(created?.sellerId).toBeNull();

    // Search narrows the table to the one code.
    await page.getByPlaceholder('Tìm theo mã giảm giá…').fill(code);
    const dataRows = page.getByRole('row').filter({ has: page.getByRole('cell') });
    await expect(dataRows).toHaveCount(1);
    const row = dataRows.filter({ hasText: code });
    await expect(row.getByText('Đã tắt')).toBeVisible();

    await row.getByRole('button', { name: 'Bật lại' }).click();
    await expect(page.getByText(`Đã bật lại mã ${code}.`)).toBeVisible();
    await expect(row.getByText('Đang chạy')).toBeVisible();
    expect((await findAdminVoucher(request, code))?.isActive).toBe(true);

    // Switching off asks first, in the app's own modal.
    await row.getByRole('button', { name: 'Tắt mã' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(`Tắt mã ${code}?`)).toBeVisible();
    await dialog.getByRole('button', { name: 'Tắt mã' }).click();
    await expect(page.getByText(`Đã tắt mã ${code}.`)).toBeVisible();
    await expect(row.getByText('Đã tắt')).toBeVisible();
    expect((await findAdminVoucher(request, code))?.isActive).toBe(false);
  });
});
