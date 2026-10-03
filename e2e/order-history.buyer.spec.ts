import { test, expect } from '@playwright/test';
import { listOrders, orderStatusCounts } from './api';

// Deep flow for `/orders`: the badges carry full-history counts, a status tab
// narrows the list server-side, and the order-code search finds one order and
// opens it. Read-only.

test('status tab narrows the list, and a code search opens that order', async ({ page, request }) => {
  const counts = await orderStatusCounts(request);
  const all = counts.all ?? 0;
  const completed = counts.completed ?? 0;
  test.skip(all === 0 || completed === 0, 'Buyer needs at least one completed order');
  const target = (await listOrders(request)).find((o) => o.status !== 'completed');
  test.skip(!target, 'Buyer needs an order outside "Hoàn thành" to search for');

  await page.goto('/orders');
  // Badges come from /status-counts (whole history), not from the loaded page.
  const allTab = page.getByRole('button', { name: `Tất cả (${all})` });
  const completedTab = page.getByRole('button', { name: `Hoàn thành (${completed})` });
  await expect(allTab).toBeVisible();
  await expect(completedTab).toBeVisible();

  const rows = page.getByRole('link', { name: /#ord_/ });
  await completedTab.click();
  await expect(rows.first()).toBeVisible();
  await expect(rows.filter({ hasNotText: 'Hoàn thành' }), 'every row on the tab is completed').toHaveCount(0);
  await expect(page.getByRole('link', { name: new RegExp(`#${target!.id}`) })).toHaveCount(0);

  await allTab.click();
  await page.getByPlaceholder('Tìm theo mã đơn…').fill(target!.id);
  await expect(rows).toHaveCount(1);
  await rows.first().click();
  await expect(page).toHaveURL(new RegExp(`/order/${target!.id}$`));
});
