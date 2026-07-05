import { describe, it, expect } from 'vitest';
import type { ServerCart, ServerCartItem } from '@/types';
import { addItemToCartCache } from './cartCache';

const NOW = new Date('2026-07-05T10:00:00.000Z').getTime();

function item(partial: Partial<ServerCartItem> = {}): ServerCartItem {
  return {
    id: 1,
    cartId: 10,
    productId: 100,
    skuId: null,
    skuTierIdx: null,
    quantity: 1,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...partial,
  };
}

function cart(items: ServerCartItem[]): ServerCart {
  return { id: 10, userId: 5, items, createdAt: '2026-07-01T00:00:00.000Z' };
}

describe('addItemToCartCache', () => {
  it('no-ops when the cart has not loaded yet', () => {
    expect(addItemToCartCache(undefined, { productId: 100, quantity: 1 }, NOW)).toBeUndefined();
    expect(addItemToCartCache(null, { productId: 100, quantity: 1 }, NOW)).toBeNull();
  });

  it('merges quantity into the line with the same product and sku', () => {
    const before = cart([item({ id: 1, productId: 100, skuId: 7, quantity: 2 })]);
    const after = addItemToCartCache(before, { productId: 100, quantity: 3, skuId: 7 }, NOW);
    expect(after?.items).toHaveLength(1);
    expect(after?.items[0].quantity).toBe(5);
  });

  it('treats a missing skuId as the null-sku line', () => {
    const before = cart([item({ id: 1, productId: 100, skuId: null, quantity: 1 })]);
    const after = addItemToCartCache(before, { productId: 100, quantity: 2 }, NOW);
    expect(after?.items).toHaveLength(1);
    expect(after?.items[0].quantity).toBe(3);
  });

  it('appends a temporary item for a different sku of the same product', () => {
    const before = cart([item({ id: 1, productId: 100, skuId: 7 })]);
    const after = addItemToCartCache(before, { productId: 100, quantity: 1, skuId: 8 }, NOW);
    expect(after?.items).toHaveLength(2);
    expect(after?.items[1]).toMatchObject({
      id: -NOW,
      cartId: 10,
      productId: 100,
      skuId: 8,
      quantity: 1,
      createdAt: new Date(NOW).toISOString(),
    });
  });

  it('does not mutate the input cart', () => {
    const before = cart([item({ quantity: 1 })]);
    addItemToCartCache(before, { productId: 100, quantity: 4 }, NOW);
    expect(before.items[0].quantity).toBe(1);
  });
});
