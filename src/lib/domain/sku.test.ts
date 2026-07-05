import { describe, it, expect } from 'vitest';
import type { ProductSku } from '@/types';
import { isValidSku, getValidSkus, findMatchingSku, getOptionStock } from './sku';

function sku(partial: Partial<ProductSku> & { tierIdx: number[] }): ProductSku {
  return {
    id: 1,
    sku: 'SKU',
    price: 1000,
    stock: partial.stockQuantity ?? 0,
    stockQuantity: 0,
    ...partial,
  };
}

describe('isValidSku / getValidSkus', () => {
  it('accepts a SKU whose tier count matches the variation count', () => {
    expect(isValidSku(sku({ tierIdx: [0] }), 1)).toBe(true);
    expect(isValidSku(sku({ tierIdx: [0, 1] }), 2)).toBe(true);
  });

  it('rejects a malformed SKU whose tier count differs (the product #7 bug)', () => {
    // 1 variation but SKU has 2 tiers → must be filtered out
    expect(isValidSku(sku({ tierIdx: [0, 1] }), 1)).toBe(false);
    expect(getValidSkus([sku({ tierIdx: [0, 1] })], 1)).toEqual([]);
  });

  it('keeps only structurally valid SKUs', () => {
    const good = sku({ id: 1, tierIdx: [0] });
    const bad = sku({ id: 2, tierIdx: [0, 1] });
    expect(getValidSkus([good, bad], 1)).toEqual([good]);
  });

  it('treats undefined SKU list as empty', () => {
    expect(getValidSkus(undefined, 1)).toEqual([]);
  });
});

describe('findMatchingSku', () => {
  const single = [
    sku({ id: 1, tierIdx: [0], stockQuantity: 5 }),
    sku({ id: 2, tierIdx: [1], stockQuantity: 0 }),
  ];

  it('matches a single-tier selection', () => {
    expect(findMatchingSku(single, { 0: 0 }, 1)?.id).toBe(1);
    expect(findMatchingSku(single, { 0: 1 }, 1)?.id).toBe(2);
  });

  it('returns undefined until every tier is selected', () => {
    const multi = [sku({ id: 9, tierIdx: [0, 1], stockQuantity: 3 })];
    expect(findMatchingSku(multi, { 0: 0 }, 2)).toBeUndefined();
    expect(findMatchingSku(multi, { 0: 0, 1: 1 }, 2)?.id).toBe(9);
  });

  it('returns undefined for a combination that does not exist', () => {
    const multi = [sku({ id: 9, tierIdx: [0, 0], stockQuantity: 3 })];
    expect(findMatchingSku(multi, { 0: 1, 1: 1 }, 2)).toBeUndefined();
  });
});

describe('getOptionStock', () => {
  // tier0 = colour (Đỏ=0, Xanh=1), tier1 = size (S=0, M=1)
  const skus = [
    sku({ id: 1, tierIdx: [0, 0], stockQuantity: 4 }),
    sku({ id: 2, tierIdx: [0, 1], stockQuantity: 6 }),
    sku({ id: 3, tierIdx: [1, 0], stockQuantity: 0 }),
    // no [1,1] → that combination does not exist
  ];

  it('sums stock for an option across the other tier when nothing else is selected', () => {
    // Đỏ across both sizes = 4 + 6
    expect(getOptionStock(skus, 0, 0, {})).toBe(10);
  });

  it('honours a selection already made in another tier', () => {
    // size S selected → Đỏ option limited to [0,0] = 4
    expect(getOptionStock(skus, 0, 0, { 1: 0 })).toBe(4);
  });

  it('reports zero stock for an out-of-stock SKU', () => {
    // Xanh (tier0=1) only exists as [1,0] with stock 0
    expect(getOptionStock(skus, 0, 1, {})).toBe(0);
  });

  it('returns null for an option with no valid SKU (must be disabled)', () => {
    // Xanh (tier0=1) + size M (tier1=1) combination does not exist
    expect(getOptionStock(skus, 0, 1, { 1: 1 })).toBeNull();
  });
});
