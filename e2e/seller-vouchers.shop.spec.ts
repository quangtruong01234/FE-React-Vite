import { test, expect, type Page } from '@playwright/test';
import { currentUserId, deactivateSellerVoucher, findSellerVoucher } from './api';

// Deep flow for `/sell/vouchers`: the shop's own voucher console
// (`VoucherConsole` + `SELLER_VOUCHER_BINDING`) — create → edit → deactivate
// → reactivate, each step checked against the API, not just the UI.
//
// Writes real data: each run leaves one new, deactivated voucher on the shop
// account. It is always switched off again (afterEach), so a failed run never
// leaves a live test code in buyers' checkout suggestions.

let createdId: number | null = null;

test.afterEach(async ({ request }) => {
  if (createdId !== null) await deactivateSellerVoucher(request, createdId);
  createdId = null;
});

async function openConsole(page: Page): Promise<void> {
  await page.goto('/sell/vouchers');
  await expect(page.getByRole('heading', { name: 'Mã giảm giá của shop' })).toBeVisible();
}

test.describe('Seller vouchers — create, edit, switch off and on', () => {
  test('a new code is owned by the shop and survives the full lifecycle', async ({ page, request }) => {
    const code = `E2E-${Date.now().toString(36).toUpperCase()}`;
    await openConsole(page);

    // Create: percent code, typed lower-case — the console upper-cases on submit.
    await page.getByRole('button', { name: 'Tạo mã mới' }).click();
    await page.locator('#voucher-code').fill(code.toLowerCase());
    await page.locator('#voucher-description').fill('e2e seller voucher');
    await page.locator('#voucher-discount-value').fill('5');
    await page.getByRole('button', { name: 'Tạo mã', exact: true }).click();
    await expect(page.getByText(`Đã tạo mã ${code}.`)).toBeVisible();

    const created = await findSellerVoucher(request, code);
    expect(created, 'created code must be listed under /order/vouchers/mine').toBeDefined();
    createdId = created?.id ?? null;
    expect(created?.isActive).toBe(true);
    // Ownership comes from the cookie, never from the payload.
    expect(created?.sellerId).toBe(await currentUserId(request));

    const row = page.getByRole('row').filter({ hasText: code });
    await expect(row.getByText('Đang chạy')).toBeVisible();

    // Edit: the immutable fields are read-only, the conditions are not.
    await row.getByRole('button', { name: 'Sửa' }).click();
    await expect(page.locator('#voucher-code')).toHaveAttribute('readonly', '');
    await page.locator('#voucher-description').fill('e2e seller voucher (edited)');
    await page.locator('#voucher-usage-limit').fill('50');
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(page.getByText(`Đã lưu mã ${code}.`)).toBeVisible();
    await expect(row.getByText('e2e seller voucher (edited)')).toBeVisible();
    const edited = await findSellerVoucher(request, code);
    expect(edited?.description).toBe('e2e seller voucher (edited)');
    expect(edited?.usageLimit).toBe(50);

    // Deactivate goes through the confirm modal, never a native dialog.
    await row.getByRole('button', { name: 'Tắt mã' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Tắt mã' }).click();
    await expect(page.getByText(`Đã tắt mã ${code}.`)).toBeVisible();
    await expect(row.getByText('Đã tắt')).toBeVisible();
    expect((await findSellerVoucher(request, code))?.isActive).toBe(false);

    // Reactivate: VOUCHER-EDIT-01 made switching off reversible.
    await row.getByRole('button', { name: 'Bật lại' }).click();
    await expect(page.getByText(`Đã bật lại mã ${code}.`)).toBeVisible();
    await expect(row.getByText('Đang chạy')).toBeVisible();
    expect((await findSellerVoucher(request, code))?.isActive).toBe(true);
  });

  test('a fixed code without a minimum is refused before any request', async ({ page }) => {
    await openConsole(page);
    let posted = false;
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/api/order/vouchers')) posted = true;
    });

    await page.getByRole('button', { name: 'Tạo mã mới' }).click();
    await page.locator('#voucher-code').fill(`E2E-FIXED-${Date.now().toString(36).toUpperCase()}`);
    await page.getByRole('button', { name: 'Số tiền cố định' }).click();
    await page.locator('#voucher-discount-value').fill('20000');
    await page.getByRole('button', { name: 'Tạo mã', exact: true }).click();

    // VOUCHER-GUARD-01: the backend compares a fixed value against `min ?? 0`
    // and always refuses a blank minimum, so the form says so up front.
    await expect(page.getByText('Mã giảm tiền cố định cần đơn tối thiểu lớn hơn số tiền giảm')).toBeVisible();
    expect(posted, 'an invalid fixed voucher must not reach the backend').toBe(false);
  });
});
