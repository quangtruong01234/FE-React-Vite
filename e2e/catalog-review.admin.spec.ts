import { test, expect, type APIRequestContext } from '@playwright/test';
import { catalogItem, rejectCatalogItem, submitCatalogItem, type CatalogKind } from './api';

// Deep flow for `/admin/brands/pending` and `/admin/categories/pending` — the
// two pages are the same component shape, so one spec drives both. The admin
// approves one submission and rejects another with a reason; the API then
// confirms each landed in the right status.
//
// Seeds its own data: the shop account submits two `[E2E]` rows per run. There
// is no delete endpoint, so `finally` rejects both through the admin API — a
// rejected row is hidden from every list and frees its name. Seed rows are
// never touched. Each review also sends the shop one `brand_reviewed` /
// `category_reviewed` notification.

const PAGES: { kind: CatalogKind; path: string; heading: string; noun: string }[] = [
  { kind: 'brands', path: '/admin/brands/pending', heading: 'Duyệt thương hiệu', noun: 'thương hiệu' },
  { kind: 'categories', path: '/admin/categories/pending', heading: 'Duyệt danh mục', noun: 'danh mục' },
];

let shop: APIRequestContext;

test.beforeAll(async ({ playwright, baseURL }) => {
  shop = await playwright.request.newContext({ baseURL, storageState: 'e2e/.auth/shop.json' });
});

test.afterAll(async () => {
  await shop.dispose();
});

for (const { kind, path, heading, noun } of PAGES) {
  test(`${path}: approve one submission, reject another with a reason`, async ({ page }) => {
    const stamp = Date.now();
    const approveName = `[E2E] approve ${stamp}`;
    const rejectName = `[E2E] reject ${stamp}`;
    const note = `[E2E] lý do ${stamp}`;
    const approveId = await submitCatalogItem(shop, kind, approveName);
    const rejectId = await submitCatalogItem(shop, kind, rejectName);

    try {
      test.skip(approveId === null || rejectId === null, `Could not submit ${kind} as the shop account`);

      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
      const approveRow = page.getByRole('row').filter({ hasText: approveName });
      const rejectRow = page.getByRole('row').filter({ hasText: rejectName });
      await expect(approveRow).toBeVisible();
      await expect(rejectRow).toBeVisible();

      await approveRow.getByRole('button', { name: 'Duyệt', exact: true }).click();
      await expect(page.getByText(`Đã duyệt ${noun}.`)).toBeVisible();
      await expect(approveRow, 'an approved row leaves the pending queue').toHaveCount(0);
      expect((await catalogItem(page.request, kind, approveId ?? 0))?.status).toBe('active');

      await rejectRow.getByRole('button', { name: 'Từ chối', exact: true }).click();
      await page.getByPlaceholder('Lý do từ chối (tuỳ chọn)').fill(note);
      await page.getByRole('button', { name: 'Xác nhận từ chối' }).click();
      await expect(page.getByText(`Đã từ chối ${noun}.`)).toBeVisible();
      await expect(rejectRow, 'a rejected row leaves the pending queue').toHaveCount(0);
      expect(await catalogItem(page.request, kind, rejectId ?? 0)).toMatchObject({
        status: 'rejected',
        reviewNote: note,
      });
    } finally {
      if (approveId !== null) await rejectCatalogItem(page.request, kind, approveId);
      if (rejectId !== null) await rejectCatalogItem(page.request, kind, rejectId);
    }
  });
}
