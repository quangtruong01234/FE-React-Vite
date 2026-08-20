import { describe, it, expect } from 'vitest';
import { filterProductsByQuery } from './productSearch';

const products = [
  { name: 'iPhone 14', sku: 'IPH14-256-BLK' },
  { name: 'Bàn phím cơ', sku: null },
  { name: 'Chuột không dây', sku: 'MOUSE-01' },
];

describe('filterProductsByQuery', () => {
  it('does not throw on a product whose SKU is null', () => {
    expect(() => filterProductsByQuery(products, 'iph')).not.toThrow();
  });

  it('returns the list untouched for a blank query', () => {
    expect(filterProductsByQuery(products, '   ')).toBe(products);
  });

  it('matches on name, case-insensitively', () => {
    expect(filterProductsByQuery(products, 'BÀN PHÍM')).toEqual([products[1]]);
  });

  it('matches on SKU', () => {
    expect(filterProductsByQuery(products, '256-blk')).toEqual([products[0]]);
  });

  it('skips the SKU of a product that has none instead of matching it', () => {
    expect(filterProductsByQuery(products, 'mouse')).toEqual([products[2]]);
  });

  it('returns nothing when neither name nor SKU matches', () => {
    expect(filterProductsByQuery(products, 'zzz')).toEqual([]);
  });
});
