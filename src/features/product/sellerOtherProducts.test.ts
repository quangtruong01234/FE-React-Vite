import { describe, it, expect } from 'vitest';
import type { ProductWithInventory } from '@/types';
import { otherShopProducts } from './sellerOtherProducts';

function product(id: string): ProductWithInventory {
  return { id } as ProductWithInventory;
}

describe('otherShopProducts', () => {
  it('drops the product being viewed', () => {
    const list = [product('prod_1'), product('prod_2'), product('prod_3')];
    expect(otherShopProducts(list, 'prod_2').map((p) => p.id)).toEqual(['prod_1', 'prod_3']);
  });

  it('caps the strip at max, after the current product is dropped', () => {
    const list = ['prod_1', 'prod_2', 'prod_3', 'prod_4'].map(product);
    expect(otherShopProducts(list, 'prod_1', 2).map((p) => p.id)).toEqual(['prod_2', 'prod_3']);
    expect(otherShopProducts(list, 'prod_9', 2).map((p) => p.id)).toEqual(['prod_1', 'prod_2']);
  });

  it('is empty when the list has not loaded or holds only the current product', () => {
    expect(otherShopProducts(undefined, 'prod_1')).toEqual([]);
    expect(otherShopProducts([product('prod_1')], 'prod_1')).toEqual([]);
  });
});
