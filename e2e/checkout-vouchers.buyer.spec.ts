import { test, expect, type Page } from '@playwright/test';

// Deep flow for `/checkout` vouchers (VOUCHER-SHOP-01 phase 2): stack a shop
// code and a platform code, swap the platform code for another, then remove the
// shop code — asserting what the page SENDS at each step, since the backend
// prices the whole set on every change.
//
// Both voucher routes are stubbed so the run is deterministic whatever vouchers
// the DB holds, and nothing is redeemed: no order is placed, the cart is not
// touched. The real contract was probed against the local backend when this
// shipped (see CHANGELOG 2026-10-01).

const SHOP_SELLER = 'usr_e2e_shop_a';
const CATALOG = {
  SHOPA10: { scope: 'shop', sellerId: SHOP_SELLER, discountAmount: 10_000 },
  SALE50: { scope: 'platform', sellerId: null, discountAmount: 5_000 },
  SALE20: { scope: 'platform', sellerId: null, discountAmount: 2_000 },
} as const;
type Code = keyof typeof CATALOG;

function envelope(data: unknown): string {
  return JSON.stringify({ statusCode: 201, status: 'success', message: 'Request Success', data });
}

async function stubVoucherRoutes(page: Page): Promise<Array<Record<string, unknown>>> {
  const sent: Array<Record<string, unknown>> = [];
  await page.route('**/api/order/vouchers/available', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: envelope({
        itemsTotal: 1_000_000,
        vouchers: (Object.keys(CATALOG) as Code[]).map((code) => ({
          code,
          description: `e2e ${code}`,
          discountType: 'fixed',
          discountValue: CATALOG[code].discountAmount,
          minOrderAmount: 0,
          maxDiscountAmount: null,
          sellerId: CATALOG[code].sellerId,
          scope: CATALOG[code].scope,
          isEligible: true,
          ineligibleReason: null,
          discountAmount: CATALOG[code].discountAmount,
          applicableSubtotal: 1_000_000,
          amountToAdd: 0,
        })),
      }),
    });
  });
  await page.route('**/api/order/voucher/validate', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    // Keep only the voucher keys — the item list depends on the cart.
    const { items: _items, ...codesSent } = body;
    sent.push(codesSent);
    const codes = (body.voucherCodes as Code[] | undefined) ?? [body.code as Code];
    const vouchers = codes.map((code) => ({
      code,
      scope: CATALOG[code].scope,
      sellerId: CATALOG[code].sellerId,
      discountType: 'fixed',
      discountAmount: CATALOG[code].discountAmount,
    }));
    const discountAmount = vouchers.reduce((sum, v) => sum + v.discountAmount, 0);
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: envelope({
        code: codes[0],
        discountType: 'fixed',
        discountAmount,
        itemsTotal: 1_000_000,
        finalItemsTotal: 1_000_000 - discountAmount,
        vouchers,
      }),
    });
  });
  return sent;
}

test('Checkout vouchers — stack, swap and remove codes', async ({ page }) => {
  const sent = await stubVoucherRoutes(page);
  // Checkout reads the selection from router state, so enter through the cart CTA.
  await page.goto('/cart');
  const placeOrder = page.getByRole('button', { name: /ĐẶT HÀNG/ });
  await expect(placeOrder.or(page.getByText('Giỏ hàng trống'))).toBeVisible();
  test.skip(!(await placeOrder.isVisible()), 'Buyer cart is empty — cannot reach checkout');
  await placeOrder.click();
  await expect(page).toHaveURL(/\/checkout/);

  const suggestion = (code: Code) => page.getByRole('button', { name: new RegExp(`^${code}`) });
  const remove = (code: Code) => page.getByRole('button', { name: `Bỏ mã ${code}` });

  // One code goes out in the legacy `code` field.
  await suggestion('SHOPA10').click();
  await expect(remove('SHOPA10')).toBeVisible();
  await expect(suggestion('SHOPA10')).toHaveAttribute('aria-pressed', 'true');
  expect(sent.at(-1)).toEqual({ code: 'SHOPA10' });

  // A platform code stacks on top: the whole set is re-validated.
  await suggestion('SALE50').click();
  await expect(remove('SALE50')).toBeVisible();
  await expect(remove('SHOPA10')).toBeVisible();
  expect(sent.at(-1)).toEqual({ voucherCodes: ['SHOPA10', 'SALE50'] });

  // A second platform code swaps the first instead of stacking.
  await suggestion('SALE20').click();
  await expect(remove('SALE20')).toBeVisible();
  await expect(remove('SALE50')).toHaveCount(0);
  expect(sent.at(-1)).toEqual({ voucherCodes: ['SHOPA10', 'SALE20'] });

  // Removing the shop code re-prices what is left.
  await remove('SHOPA10').click();
  await expect(remove('SHOPA10')).toHaveCount(0);
  await expect(remove('SALE20')).toBeVisible();
  expect(sent.at(-1)).toEqual({ code: 'SALE20' });
});
