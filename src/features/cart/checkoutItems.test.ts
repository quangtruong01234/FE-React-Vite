import { describe, it, expect } from 'vitest';
import type { ProductWithInventory } from '@/types';
import { buildOrderItems, findStockShortages } from './checkoutItems';

function product(
  partial: Partial<ProductWithInventory> & { id: number },
): ProductWithInventory {
  return {
    name: `Product ${partial.id}`,
    price: 1000,
    inventory: { availableStock: 10 },
    ...partial,
  } as ProductWithInventory;
}

describe('buildOrderItems', () => {
  const map = new Map<number, ProductWithInventory>([
    [1, product({ id: 1, name: 'Mug' })],
  ]);

  it('maps productId, name and quantity per line', () => {
    expect(buildOrderItems([{ productId: 1, skuId: null, quantity: 2 }], map)).toEqual([
      { productId: 1, productName: 'Mug', quantity: 2 },
    ]);
  });

  it('includes skuId only when the line carries one', () => {
    const [withSku, withoutSku] = buildOrderItems(
      [
        { productId: 1, skuId: 7, quantity: 1 },
        { productId: 1, skuId: null, quantity: 1 },
      ],
      map,
    );
    expect(withSku.skuId).toBe(7);
    expect('skuId' in withoutSku).toBe(false);
  });

  it('uses an empty name for a product missing from the map', () => {
    expect(buildOrderItems([{ productId: 99, quantity: 1 }], map)[0].productName).toBe('');
  });
});

describe('findStockShortages', () => {
  it('passes when every line fits shop-level available stock', () => {
    const products = [product({ id: 1, inventory: { availableStock: 5 } })];
    expect(findStockShortages([{ productId: 1, skuId: null, quantity: 5 }], products)).toEqual({});
  });

  it('flags a line exceeding shop-level available stock with the remaining amount', () => {
    const products = [product({ id: 1, inventory: { availableStock: 3 } })];
    expect(findStockShortages([{ productId: 1, skuId: null, quantity: 4 }], products)).toEqual({
      1: 'Chỉ còn 3 sản phẩm',
    });
  });

  it('checks the matched SKU stock when the line carries a skuId', () => {
    const products = [
      product({
        id: 1,
        inventory: { availableStock: 100 },
        skus: [{ id: 7, stockQuantity: 2 } as never],
      }),
    ];
    expect(findStockShortages([{ productId: 1, skuId: 7, quantity: 3 }], products)).toEqual({
      1: 'Chỉ còn 2 sản phẩm',
    });
    expect(findStockShortages([{ productId: 1, skuId: 7, quantity: 2 }], products)).toEqual({});
  });

  it('treats an unmatched skuId as 0 available', () => {
    const products = [
      product({ id: 1, skus: [{ id: 7, stockQuantity: 5 } as never] }),
    ];
    expect(findStockShortages([{ productId: 1, skuId: 999, quantity: 1 }], products)).toEqual({
      1: 'Chỉ còn 0 sản phẩm',
    });
  });

  it('falls back to shop-level stock for a skuId line when the product has no SKUs', () => {
    const products = [product({ id: 1, inventory: { availableStock: 4 } })];
    expect(findStockShortages([{ productId: 1, skuId: 7, quantity: 4 }], products)).toEqual({});
  });

  it('treats a product missing from the fresh fetch as 0 available', () => {
    expect(findStockShortages([{ productId: 99, skuId: null, quantity: 1 }], [])).toEqual({
      99: 'Chỉ còn 0 sản phẩm',
    });
  });
});
