import { describe, it, expect } from 'vitest';
import { productCategoryNames } from './productCategories';
import type { Category } from '@/types';

const cat = (id: number, name: string): Category => ({ id, name, isActive: true });

describe('productCategoryNames', () => {
  it('returns all category names from the hydrated categories[] list', () => {
    expect(
      productCategoryNames({ categories: [cat(1, 'Điện tử'), cat(2, 'Phụ kiện')] }),
    ).toEqual(['Điện tử', 'Phụ kiện']);
  });

  it('falls back to the single category when categories[] is empty/absent', () => {
    expect(productCategoryNames({ categories: [], category: cat(3, 'Thời trang') })).toEqual([
      'Thời trang',
    ]);
    expect(productCategoryNames({ category: cat(3, 'Thời trang') })).toEqual(['Thời trang']);
  });

  it('returns an empty list when no category data exists', () => {
    expect(productCategoryNames({})).toEqual([]);
  });
});
