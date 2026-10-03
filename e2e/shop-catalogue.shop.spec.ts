import { test, expect } from '@playwright/test';
import { patchProduct, shopProducts, type ShopProductRow } from './api';

// Deep flow for the seller's catalogue: `/shop` (search, show/hide toggle,
// delete confirm), `/sell/:id` (rename through the edit form) and
// `/shop/analytics` (filters drive the seller analytics request).
//
// Writes real data and puts it back: the hidden product is shown again and the
// renamed one gets its old name back (finally). The delete is always cancelled
// — buyer specs shop from this catalogue.

let product: ShopProductRow | null = null;

test.beforeEach(async ({ request }) => {
  // Visible, not risk-blocked (the toggle is locked then), single SKU (the
  // edit form's stock matrix is out of scope here).
  product = (await shopProducts(request)).find((p) => p.isActive && !p.approvalBlocked && p.variations === 0) ?? null;
});

test.describe('Seller catalogue — /shop and /sell/:id', () => {
  test('search finds a product by SKU, and hiding it lands on the server', async ({ page, request }) => {
    test.skip(product === null, 'shop has no visible single-SKU product');
    if (product === null) return;
    const { id, name, sku } = product;

    try {
      await page.goto('/shop');
      await expect(page.getByRole('heading', { name: 'Kênh người bán' })).toBeVisible();
      await page.getByPlaceholder('Tìm tên hoặc SKU...').fill(sku);
      const productTable = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'Hiển thị' }) });
      const dataRows = productTable.getByRole('row').filter({ has: page.getByRole('cell') });
      await expect(dataRows.filter({ hasText: sku })).toHaveCount(1);
      const row = dataRows.filter({ hasText: sku });
      await expect(row.getByRole('link', { name })).toBeVisible();

      const visible = row.getByRole('switch', { name: `Hiển thị ${name}` });
      await expect(visible).toHaveAttribute('aria-checked', 'true');
      await visible.click();
      await expect(page.getByText(`Đã ẩn "${name}".`)).toBeVisible();
      await expect(visible).toHaveAttribute('aria-checked', 'false');
      await expect.poll(async () => (await shopProducts(request)).find((p) => p.id === id)?.isActive).toBe(false);

      await visible.click();
      await expect(page.getByText(`Đã bật hiển thị "${name}".`)).toBeVisible();
      await expect(visible).toHaveAttribute('aria-checked', 'true');
      await expect.poll(async () => (await shopProducts(request)).find((p) => p.id === id)?.isActive).toBe(true);

      // Delete asks first, naming the product; cancelling keeps it.
      await row.getByRole('button', { name: `Xóa ${name}` }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText(`Xóa "${name}" khỏi gian hàng? Hành động này không thể hoàn tác.`)).toBeVisible();
      await dialog.getByRole('button', { name: 'Hủy' }).click();
      await expect(dialog).toBeHidden();
      await expect(row).toBeVisible();
      expect((await shopProducts(request)).some((p) => p.id === id)).toBe(true);
    } finally {
      await patchProduct(request, id, { isActive: true });
    }
  });

  test('the edit form saves a rename and opens the product on its new name', async ({ page, request }) => {
    test.skip(product === null, 'shop has no visible single-SKU product');
    if (product === null) return;
    const { id, name, sku } = product;
    const renamed = `${name} E2E`;

    try {
      await page.goto('/shop');
      await page.getByPlaceholder('Tìm tên hoặc SKU...').fill(sku);
      await page.getByRole('button', { name: `Sửa ${name}` }).click();
      await expect(page).toHaveURL(`/sell/${id}`);
      await expect(page.getByRole('heading', { name: 'Sửa sản phẩm' })).toBeVisible();

      const nameInput = page.getByPlaceholder('VD: iPhone 14 Pro Max 256GB');
      await expect(nameInput).toHaveValue(name);
      await nameInput.fill(renamed);
      await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
      await expect(page.getByRole('button', { name: '✓ Đã lưu!' })).toBeVisible();

      // The page hands over to the product itself once the save lands.
      await expect(page).toHaveURL(`/product/${id}`);
      await expect(page.getByRole('heading', { name: renamed })).toBeVisible();
      expect((await shopProducts(request)).find((p) => p.id === id)?.name).toBe(renamed);
    } finally {
      await patchProduct(request, id, { name });
    }
  });
});

test.describe('Seller analytics — /shop/analytics', () => {
  test('the interval switch refetches and the cards show what the server counted', async ({ page }) => {
    await page.goto('/shop/analytics');
    await expect(page.getByRole('heading', { name: 'Thống kê bán hàng', level: 1 })).toBeVisible();

    const monthly = page.waitForResponse((res) => {
      const url = new URL(res.url());
      return url.pathname.endsWith('/order/seller/analytics') && url.searchParams.get('interval') === 'month';
    });
    await page.getByRole('button', { name: 'Theo tháng' }).click();
    const res = await monthly;
    expect(res.ok()).toBe(true);
    const body: unknown = await res.json();
    const summary = (body as { data?: { summary?: { totalOrders?: unknown } } }).data?.summary;
    expect(typeof summary?.totalOrders).toBe('number');

    const totalCard = page.getByText('Tổng đơn', { exact: true }).locator('..');
    await expect(totalCard).toContainText(String(summary?.totalOrders));
    await expect(page.getByText('Doanh thu theo thời gian').locator('..').getByText('Theo tháng', { exact: true })).toBeVisible();
  });
});
