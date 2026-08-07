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

  it('picks up a newly added optional field', () => {
    expect(dirtyProductPatch(saved, { ...saved, weight: 850 })).toEqual({ weight: 850 });
  });

  // Backend 2026-08-07: `null` means "clear this column" — but only for the six
  // nullable ones. Every other field 400s on `null`.
  describe('clearing a field the seller emptied', () => {
    it('sends null for each of the six clearable fields', () => {
      const base: CreateProductDto = { ...saved, sellerNotes: 'Bảo hành 12 tháng', weight: 850 };

      expect(dirtyProductPatch(base, { ...base, description: undefined })).toEqual({ description: null });
      expect(dirtyProductPatch(base, { ...base, sku: undefined })).toEqual({ sku: null });
      expect(dirtyProductPatch(base, { ...base, brandId: null })).toEqual({ brandId: null });
      expect(dirtyProductPatch(base, { ...base, sellerNotes: undefined })).toEqual({ sellerNotes: null });
      expect(dirtyProductPatch(base, { ...base, weight: undefined })).toEqual({ weight: null });
      expect(dirtyProductPatch(base, { ...base, imageUrls: undefined })).toEqual({ imageUrls: null });
    });

    it('omits a non-clearable field instead of sending null (which would 400)', () => {
      // `condition` and `stockQuantity` reject null server-side; an emptied one
      // must stay absent so the save is not rejected outright.
      const patch = dirtyProductPatch(saved, {
        ...saved,
        condition: undefined,
        stockQuantity: undefined,
      });

      expect(patch).toEqual({});
    });

    it('does not clear a field that was already empty on the saved product', () => {
      const base: CreateProductDto = { ...saved, description: undefined, brandId: null };

      expect(dirtyProductPatch(base, { ...base })).toEqual({});
    });

    it('still sends nothing when an untouched form is re-submitted', () => {
      // The empty-patch shortcut in CreateProductPage relies on this: a clear
      // must never be emitted for a field the seller did not touch.
      const base: CreateProductDto = { ...saved, sellerNotes: 'Bảo hành 12 tháng', weight: 850 };

      expect(dirtyProductPatch(base, { ...base })).toEqual({});
    });
  });
});
