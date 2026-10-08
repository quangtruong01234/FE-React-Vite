import { describe, it, expect } from 'vitest';
import type { OrderItem, ProductWithInventory } from '@/types';
import { planReorder, reorderAddFailureReason, reorderProductIds } from './reorderItems';

describe('reorderAddFailureReason', () => {
  it('maps the CART-STOCK-01 refusals to the skip reason the buyer reads', () => {
    expect(reorderAddFailureReason({ statusCode: 409, errorCode: 'PRODUCT_INACTIVE' })).toBe('unavailable');
    expect(reorderAddFailureReason({ statusCode: 409, errorCode: 'OUT_OF_STOCK' })).toBe('outOfStock');
  });

  it('keeps an over-quantity refusal and any other error as a bare failure', () => {
    expect(reorderAddFailureReason({ statusCode: 409, errorCode: 'QUANTITY_EXCEEDS_STOCK' })).toBe('failed');
    expect(reorderAddFailureReason({ statusCode: 500, message: 'boom' })).toBe('failed');
    expect(reorderAddFailureReason(new Error('network'))).toBe('failed');
  });
});

function item(partial: Partial<OrderItem> = {}): OrderItem {
  return { id: 1, productId: 'prod_1', quantity: 2, price: 100, skuId: null, ...partial };
}

function product(partial: Partial<ProductWithInventory> = {}): ProductWithInventory {
  return {
    id: 'prod_1',
    isActive: true,
    inventory: { availableStock: 10 },
    skus: [],
    ...partial,
  } as ProductWithInventory;
}

function map(...products: ProductWithInventory[]): Map<string, ProductWithInventory> {
  return new Map(products.map((p) => [p.id, p]));
}

describe('reorderProductIds', () => {
  it('dedupes and drops lines whose product was deleted', () => {
    const items = [item({ productId: 'prod_1' }), item({ productId: null }), item({ productId: 'prod_1', skuId: 5 })];
    expect(reorderProductIds(items)).toEqual(['prod_1']);
  });
});

describe('planReorder', () => {
  it('re-adds a plain line with its original quantity', () => {
    expect(planReorder([item()], map(product()))).toEqual({
      lines: [{ productId: 'prod_1', quantity: 2 }],
      skipped: [],
    });
  });

  it('re-adds a SKU line against that SKU’s stock', () => {
    const p = product({ skus: [{ id: 5, sku: 'A', price: 1, stockQuantity: 9, tierIdx: [0] }] });
    expect(planReorder([item({ skuId: 5 })], map(p)).lines).toEqual([
      { productId: 'prod_1', quantity: 2, skuId: 5 },
    ]);
  });

  it('caps the quantity at what is in stock now', () => {
    const p = product({ inventory: { availableStock: 1 } as ProductWithInventory['inventory'] });
    expect(planReorder([item({ quantity: 3 })], map(p)).lines[0].quantity).toBe(1);
  });

  it('skips each unbuyable line with its own reason', () => {
    const items = [
      item({ id: 1, productId: null }),
      item({ id: 2, productId: 'prod_gone' }),
      item({ id: 3, productId: 'prod_off' }),
      item({ id: 4, productId: 'prod_empty' }),
      item({ id: 5, productId: 'prod_sku', skuId: 99 }),
      item({ id: 6, productId: 'prod_sku', skuId: 7 }),
      item({ id: 7, productId: 'prod_sku', skuId: null }),
    ];
    const products = map(
      product({ id: 'prod_off', isActive: false }),
      product({ id: 'prod_empty', inventory: { availableStock: 0 } as ProductWithInventory['inventory'] }),
      product({ id: 'prod_sku', skus: [{ id: 7, sku: 'B', price: 1, stockQuantity: 0, tierIdx: [0] }] }),
    );
    const { lines, skipped } = planReorder(items, products);
    expect(lines).toEqual([]);
    expect(skipped.map((s) => [s.item.id, s.reason])).toEqual([
      [1, 'deleted'],
      [2, 'deleted'],
      [3, 'unavailable'],
      [4, 'outOfStock'],
      [5, 'unavailable'],
      [6, 'outOfStock'],
      [7, 'unavailable'],
    ]);
  });
});
