import { test, expect } from '@playwright/test';
import {
  addToWishlist,
  buyableProduct,
  cartLines,
  removeCartLine,
  removeFromWishlist,
  setCartLineQuantity,
  wishlistIds,
  type BuyableProduct,
} from './api';

// Deep flow for `/product/:id` and `/wishlist`: the two writes a buyer makes from
// a product page — the heart and "add to cart" — each checked against the API,
// and the heart followed through to the wishlist page and back out.
//
// Writes real data and puts it back: the wishlist membership is restored to what
// it was before the run, and the cart line goes back to its old quantity (or is
// dropped if the spec created it) — `cart.buyer` and `checkout-*` need the
// seeded cart as it was.

let product: BuyableProduct | null = null;

test.beforeEach(async ({ request }) => {
  product = await buyableProduct(request);
});

test.describe('Product detail — wishlist and cart', () => {
  test('the heart adds to the wishlist, and the wishlist page takes it back out', async ({ page, request }) => {
    test.skip(product === null, 'no in-stock, single-SKU product from another seller to target');
    if (product === null) return;
    const { id, name } = product;
    const wasWishlisted = (await wishlistIds(request)).has(id);
    await removeFromWishlist(request, id);

    try {
      await page.goto(`/product/${id}`);
      await expect(page.getByRole('heading', { name })).toBeVisible();
      const heart = page.getByRole('button', { name: 'Thêm vào yêu thích' });
      await expect(heart).toHaveAttribute('aria-pressed', 'false');
      await heart.click();
      const filled = page.getByRole('button', { name: 'Bỏ yêu thích' });
      await expect(filled).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(async () => (await wishlistIds(request)).has(id)).toBe(true);

      await page.goto('/wishlist');
      await expect(page.getByRole('heading', { name: 'Yêu thích' })).toBeVisible();
      await page.getByPlaceholder('Tìm theo tên sản phẩm…').fill(name);
      const card = page.locator(`a[href="/product/${id}"]`).first();
      await expect(card).toBeVisible();
      await card.getByRole('button', { name: 'Bỏ yêu thích' }).click();
      // The page refetches on settle, so the card leaves the list for real.
      await expect(page.locator(`a[href="/product/${id}"]`)).toHaveCount(0);
      await expect.poll(async () => (await wishlistIds(request)).has(id)).toBe(false);
    } finally {
      if (wasWishlisted) await addToWishlist(request, id);
      else await removeFromWishlist(request, id);
    }
  });

  test('adding two units lands them on the cart line', async ({ page, request }) => {
    test.skip(product === null, 'no in-stock, single-SKU product from another seller to target');
    if (product === null) return;
    const { id, name } = product;
    const before = (await cartLines(request)).find((l) => l.productId === id);

    try {
      await page.goto(`/product/${id}`);
      await expect(page.getByRole('heading', { name })).toBeVisible();
      await page.getByRole('button', { name: 'Tăng số lượng' }).click();
      await expect(page.getByRole('spinbutton')).toHaveValue('2');
      await page.getByRole('button', { name: /THÊM VÀO GIỎ/ }).click();

      // Once the line exists the button says so, with the quantity it would add.
      await expect(page.getByRole('button', { name: 'THÊM VÀO GIỎ (+2)' })).toBeVisible();
      await expect
        .poll(async () => (await cartLines(request)).find((l) => l.productId === id)?.quantity ?? 0)
        .toBe((before?.quantity ?? 0) + 2);
    } finally {
      const after = (await cartLines(request)).find((l) => l.productId === id);
      if (after && before) await setCartLineQuantity(request, after.id, before.quantity);
      else if (after) await removeCartLine(request, after.id);
    }
  });
});
