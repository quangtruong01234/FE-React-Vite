import { test, expect, type Locator } from '@playwright/test';
import { deleteAddress, listAddresses, setDefaultAddress } from './api';

// Deep flow for `/addresses`: add → edit → delete one address through the
// modal (with the chained GHN province → district → ward selects), each step
// checked against `/user/me/addresses`.
//
// Writes real data and removes it: the spec's own address is always deleted
// (finally), and the buyer's default is put back if the run moved it —
// checkout specs ship to that default.

// Picks the first real option once the chain has loaded it (index 0 is the placeholder).
async function pickFirst(select: Locator): Promise<void> {
  await expect(select).toBeEnabled();
  await expect.poll(() => select.locator('option').count()).toBeGreaterThan(1);
  await select.selectOption({ index: 1 });
}

test.describe('Address book — add, edit, delete', () => {
  test('a new address can be edited and deleted, and the default never moves', async ({ page, request }) => {
    const name = `[E2E] Nguoi nhan ${Date.now().toString(36)}`;
    const before = await listAddresses(request);
    const defaultBefore = before.find((a) => a.isDefault)?.id ?? null;
    let createdId: string | null = null;

    try {
      await page.goto('/addresses');
      await expect(page.getByRole('heading', { name: 'Sổ địa chỉ' })).toBeVisible();

      await page.getByRole('button', { name: 'Thêm địa chỉ', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByRole('heading', { name: 'Thêm địa chỉ mới' })).toBeVisible();
      await dialog.getByPlaceholder('Nguyễn Văn A').fill(name);
      await dialog.getByPlaceholder('0987654321').fill('0987654321');
      await dialog.getByPlaceholder('123 Nguyễn Huệ').fill('1 Duong E2E');
      // Each level stays disabled until the one above is chosen.
      await expect(dialog.getByLabel('Quận/huyện')).toBeDisabled();
      // A named province: the GHN sandbox lists test provinces with no districts.
      await dialog.getByLabel('Tỉnh/thành phố').selectOption({ label: 'Hồ Chí Minh' });
      await pickFirst(dialog.getByLabel('Quận/huyện'));
      await pickFirst(dialog.getByLabel('Phường/xã'));
      await dialog.getByRole('button', { name: 'Thêm địa chỉ', exact: true }).click();
      await expect(dialog).toBeHidden();

      const row = page.getByRole('listitem').filter({ hasText: name });
      await expect(row).toBeVisible();
      const created = (await listAddresses(request)).find((a) => a.recipientName === name);
      expect(created, 'created address must be listed under /user/me/addresses').toBeDefined();
      createdId = created?.id ?? null;
      // The checkbox was left alone, so an existing default stays the default.
      if (defaultBefore !== null) expect(created?.isDefault).toBe(false);

      await row.getByRole('button', { name: 'Chỉnh sửa địa chỉ' }).click();
      await expect(dialog.getByRole('heading', { name: 'Chỉnh sửa địa chỉ' })).toBeVisible();
      await expect(dialog.getByPlaceholder('Nguyễn Văn A')).toHaveValue(name);
      await dialog.getByPlaceholder('123 Nguyễn Huệ').fill('2 Duong E2E');
      await dialog.getByRole('button', { name: 'Lưu thay đổi' }).click();
      await expect(dialog).toBeHidden();
      await expect(row.getByText('2 Duong E2E', { exact: false })).toBeVisible();
      expect((await listAddresses(request)).find((a) => a.id === createdId)?.addressLine).toBe('2 Duong E2E');

      await row.getByRole('button', { name: 'Xóa địa chỉ' }).click();
      const confirm = page.getByRole('dialog');
      await expect(confirm.getByText(name, { exact: false })).toBeVisible();
      await confirm.getByRole('button', { name: 'Xóa', exact: true }).click();
      // The open modal hides the page from the a11y tree, so the row reads as gone
      // before the delete lands — wait for the modal to close first.
      await expect(confirm).toBeHidden();
      await expect(row).toHaveCount(0);
      expect((await listAddresses(request)).some((a) => a.id === createdId)).toBe(false);
      createdId = null;
      expect((await listAddresses(request)).find((a) => a.isDefault)?.id ?? null).toBe(defaultBefore);
    } finally {
      if (createdId !== null) await deleteAddress(request, createdId);
      const defaultNow = (await listAddresses(request)).find((a) => a.isDefault)?.id ?? null;
      if (defaultBefore !== null && defaultNow !== defaultBefore) await setDefaultAddress(request, defaultBefore);
    }
  });
});
