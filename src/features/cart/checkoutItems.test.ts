import { describe, it, expect } from 'vitest';
import type { ProductWithInventory } from '@/types';
import { buildOrderItems, cartLineName, findStockShortages } from './checkoutItems';

function product(
  partial: Partial<ProductWithInventory> & { id: string },
): ProductWithInventory {
  return {
    name: `Product ${partial.id}`,
    price: 1000,
    inventory: { availableStock: 10 } as ProductWithInventory['inventory'],
    ...partial,
  } as ProductWithInventory;
}

describe('buildOrderItems', () => {
  const map = new Map<string, ProductWithInventory>([
    ['prod_1', product({ id: 'prod_1', name: 'Mug' })],
  ]);

  it('maps productId, name and quantity per line', () => {
    expect(buildOrderItems([{ productId: 'prod_1', skuId: null, quantity: 2 }], map)).toEqual([
      { productId: 'prod_1', productName: 'Mug', quantity: 2 },
    ]);
  });

  it('includes skuId only when the line carries one', () => {
    const [withSku, withoutSku] = buildOrderItems(
      [
        { productId: 'prod_1', skuId: 7, quantity: 1 },
        { productId: 'prod_1', skuId: null, quantity: 1 },
      ],
      map,
    );
    expect(withSku.skuId).toBe(7);
    expect('skuId' in withoutSku).toBe(false);
  });

  it('uses an empty name for a product missing from the map', () => {
    expect(buildOrderItems([{ productId: 'prod_99', quantity: 1 }], map)[0].productName).toBe('');
  });
});

describe('cartLineName', () => {
  it('uses the product name whenever the product resolved', () => {
    expect(cartLineName({ name: 'Tai nghe' }, false)).toBe('Tai nghe');
    // Even mid-failure: a row we did resolve is not in doubt.
    expect(cartLineName({ name: 'Tai nghe' }, true)).toBe('Tai nghe');
  });

  it('claims deletion only when the lookup itself succeeded', () => {
    expect(cartLineName(undefined, false)).toBe('Sản phẩm không còn tồn tại');
  });

  it('does not claim deletion when the lookup failed', () => {
    // BATCH-FAIL-01: an outage answered `200 []`, and now `502`. Neither is
    // evidence that the shopper's items are gone.
    expect(cartLineName(undefined, true)).toBe('Chưa tải được tên sản phẩm');
  });
});

describe('findStockShortages', () => {
  it('passes when every line fits shop-level available stock', () => {
    const products = [product({ id: 'prod_1', inventory: { availableStock: 5 } as ProductWithInventory['inventory'] })];
    expect(findStockShortages([{ productId: 'prod_1', skuId: null, quantity: 5 }], products)).toEqual({});
  });

  it('flags a line exceeding shop-level available stock with the remaining amount', () => {
    const products = [product({ id: 'prod_1', inventory: { availableStock: 3 } as ProductWithInventory['inventory'] })];
    expect(findStockShortages([{ productId: 'prod_1', skuId: null, quantity: 4 }], products)).toEqual({
      prod_1: 'Chỉ còn 3 sản phẩm',
    });
  });

  it('checks the matched SKU stock when the line carries a skuId', () => {
    const products = [
      product({
        id: 'prod_1',
        inventory: { availableStock: 100 } as ProductWithInventory['inventory'],
        skus: [{ id: 7, stockQuantity: 2 } as never],
      }),
    ];
    expect(findStockShortages([{ productId: 'prod_1', skuId: 7, quantity: 3 }], products)).toEqual({
      prod_1: 'Chỉ còn 2 sản phẩm',
    });
    expect(findStockShortages([{ productId: 'prod_1', skuId: 7, quantity: 2 }], products)).toEqual({});
  });

  it('treats an unmatched skuId as 0 available', () => {
    const products = [
      product({ id: 'prod_1', skus: [{ id: 7, stockQuantity: 5 } as never] }),
    ];
    expect(findStockShortages([{ productId: 'prod_1', skuId: 999, quantity: 1 }], products)).toEqual({
      prod_1: 'Chỉ còn 0 sản phẩm',
    });
  });

  it('falls back to shop-level stock for a skuId line when the product has no SKUs', () => {
    const products = [product({ id: 'prod_1', inventory: { availableStock: 4 } as ProductWithInventory['inventory'] })];
    expect(findStockShortages([{ productId: 'prod_1', skuId: 7, quantity: 4 }], products)).toEqual({});
  });

  it('treats a product missing from the fresh fetch as 0 available', () => {
    expect(findStockShortages([{ productId: 'prod_99', skuId: null, quantity: 1 }], [])).toEqual({
      prod_99: 'Chỉ còn 0 sản phẩm',
    });
  });
});
