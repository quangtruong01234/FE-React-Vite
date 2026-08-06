import { describe, it, expect } from 'vitest';
import { dirtyProductPatch } from './productPatch';
import type { CreateProductDto } from '@/types';

const saved: CreateProductDto = {
  name: 'Bàn phím cơ',
  description: 'Switch đỏ',
  price: 1200000,
  stockQuantity: 8,
  sku: 'KB-01',
  brandId: 3,
  categoryIds: [4, 7],
  isActive: true,
  condition: 'new',
  imageUrls: ['https://res.cloudinary.com/c/trybuy/products/a.jpg'],
};

describe('dirtyProductPatch', () => {
  it('returns nothing when the form matches the saved product', () => {
    expect(dirtyProductPatch(saved, { ...saved })).toEqual({});
  });

  it('sends only the field that changed', () => {
    expect(dirtyProductPatch(saved, { ...saved, price: 990000 })).toEqual({ price: 990000 });
  });

  it('leaves a co-edited field alone so a second tab cannot revert it', () => {
    // Tab A only touched the price; `name` must not ride along with the old value.
    const patch = dirtyProductPatch(saved, { ...saved, price: 990000 });

    expect(patch).not.toHaveProperty('name');
    expect(patch).not.toHaveProperty('categoryIds');
    expect(patch).not.toHaveProperty('imageUrls');
  });

  it('compares arrays by value, not by reference', () => {
    expect(dirtyProductPatch(saved, { ...saved, categoryIds: [4, 7] })).toEqual({});
    expect(dirtyProductPatch(saved, { ...saved, categoryIds: [4, 9] })).toEqual({ categoryIds: [4, 9] });
  });

  it('omits the SKU when it did not change, so no duplicate check is triggered', () => {
    expect(dirtyProductPatch(saved, { ...saved, stockQuantity: 12 })).toEqual({ stockQuantity: 12 });
  });

  it('sends variations and skuList together when only one of them moved', () => {
    const base: CreateProductDto = {
      ...saved,
      variations: [{ name: 'Màu', options: ['Đen', 'Trắng'] }],
      skuList: [
        { tierIdx: '[0]', price: 1200000, stockQuantity: 4 },
        { tierIdx: '[1]', price: 1300000, stockQuantity: 4 },
      ],
    };
    const next: CreateProductDto = {
      ...base,
      skuList: [
        { tierIdx: '[0]', price: 1250000, stockQuantity: 4 },
        { tierIdx: '[1]', price: 1300000, stockQuantity: 4 },
      ],
    };

    const patch = dirtyProductPatch(base, next);

    expect(patch.skuList).toEqual(next.skuList);
    // Unchanged, but the backend validates skuList against the same request's
    // variations — dropping it would orphan the rows.
    expect(patch.variations).toEqual(base.variations);
  });

  it('drops keys whose next value is undefined (PATCH cannot clear a field)', () => {
    const patch = dirtyProductPatch(saved, { ...saved, description: undefined });

    expect(patch).not.toHaveProperty('description');
    expect(patch).toEqual({});
  });

  it('picks up a newly added optional field', () => {
    expect(dirtyProductPatch(saved, { ...saved, weight: 850 })).toEqual({ weight: 850 });
  });
});
