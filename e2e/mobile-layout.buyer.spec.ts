import { test, expect, type Page } from '@playwright/test';
import { buyableProduct, cartLines } from './api';

// MOBILE-OVERFLOW-01 — the buyer purchase path must fit a phone screen. Three
// layouts were wider than the viewport, so the page panned sideways and a tap
// on "ĐẶT HÀNG" landed on whatever slid under the finger:
//   · Header — logo + 6 icon controls needed 380px on a 390px screen;
//   · `/cart`, `/product/:id` — a single-column `grid` with the implicit `auto`
//     track grows to its min-content, which a `truncate` name or the thumbnail
//     strip sets to the full text / strip width (fixed with `grid-cols-1`,
//     i.e. `minmax(0,1fr)`, as `CheckoutPage` already did).
//
// Measured against `clientWidth`, never `innerWidth`: with `isMobile` the
// layout viewport widens to fit the overflow, so `scrollWidth - innerWidth`
// reads 0 on exactly the pages that are broken.

async function overflowPx(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

for (const width of [360, 390]) {
  test.describe(`mobile ${width}px`, () => {
    test.use({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true });

    test('purchase path has no horizontal overflow', async ({ page, request }) => {
      const product = await buyableProduct(request);
      const paths = ['/', '/marketplace', '/cart', '/checkout', '/orders'];
      if (product !== null) paths.push(`/product/${product.id}`);

      for (const path of paths) {
        await page.goto(path);
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
        expect(await overflowPx(page), `${path} overflows the ${width}px viewport`).toBeLessThanOrEqual(0);
      }
    });

    test('a tap on ĐẶT HÀNG opens checkout', async ({ page, request }) => {
      const lines = await cartLines(request);
      test.skip(lines.length === 0, 'Buyer cart needs at least 1 line');

      await page.goto('/cart');
      await page.getByRole('button', { name: `ĐẶT HÀNG (${lines.length}) →` }).tap();
      await expect(page).toHaveURL(/\/checkout$/);
      // Checkout is only opened, never confirmed — the cart is left as found.
      expect(await cartLines(request)).toHaveLength(lines.length);
    });
  });
}
