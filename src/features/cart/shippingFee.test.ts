import { describe, it, expect } from 'vitest';
import type { ProductWithInventory } from '@/types';
import { effectiveUnitPrice, buildShippingFeeItems } from './shippingFee';

function product(
  partial: Partial<ProductWithInventory> & { id: number },
): ProductWithInventory {
  return {
    name: `Product ${partial.id}`,
    price: 1000,
    weight: 500,
    inventory: { availableStock: 10 },
    ...partial,
  } as ProductWithInventory;
}

describe('effectiveUnitPrice', () => {
  it('uses the matched SKU price when the line carries a skuId', () => {
    const p = product({ id: 1, price: 1000, skus: [{ id: 7, price: 2500 } as never] });
    expect(effectiveUnitPrice({ skuId: 7 }, p)).toBe(2500);
  });

  it('falls back to the product price when no skuId is set', () => {
    expect(effectiveUnitPrice({ skuId: null }, product({ id: 1, price: 1000 }))).toBe(1000);
  });

  it('falls back to the product price when the skuId matches no SKU', () => {
    const p = product({ id: 1, price: 1000, skus: [{ id: 7, price: 2500 } as never] });
    expect(effectiveUnitPrice({ skuId: 999 }, p)).toBe(1000);
  });

  it('coerces decimal-string prices from the backend', () => {
    const p = product({ id: 1, price: '1500.00' as unknown as number });
    expect(effectiveUnitPrice({ skuId: null }, p)).toBe(1500);
  });

  it('returns 0 for a missing product', () => {
    expect(effectiveUnitPrice({ skuId: null }, undefined)).toBe(0);
  });
});

describe('buildShippingFeeItems', () => {
  const map = new Map<number, ProductWithInventory>([
    [1, product({ id: 1, name: 'Mug', price: 1000, weight: 300 })],
    [2, product({ id: 2, name: 'Heavy', price: 2000, weight: null })],
  ]);

  it('maps name, quantity, price and weight per line', () => {
    expect(
      buildShippingFeeItems([{ productId: 1, skuId: null, quantity: 2 }], map),
    ).toEqual([{ productName: 'Mug', quantity: 2, price: 1000, weight: 300 }]);
  });

  it('passes undefined weight for an unweighed (null) product so BE uses its default', () => {
    expect(buildShippingFeeItems([{ productId: 2, skuId: null, quantity: 1 }], map)[0].weight).toBeUndefined();
  });

  it('handles a product missing from the map (price 0, no name/weight)', () => {
    expect(
      buildShippingFeeItems([{ productId: 99, skuId: null, quantity: 1 }], map),
    ).toEqual([{ productName: undefined, quantity: 1, price: 0, weight: undefined }]);
  });
});
