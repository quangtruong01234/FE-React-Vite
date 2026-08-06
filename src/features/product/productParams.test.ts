import { describe, it, expect } from 'vitest';
import { buildProductParams, DEFAULT_MAX_PRICE, type ProductQueryState } from './productParams';

const base: ProductQueryState = {
  page: 1,
  limit: 12,
  sortBy: 'createdAt',
  sortOrder: 'DESC',
  search: '',
  categoryIds: [],
  brandIds: [],
  provinceIds: [],
  minPrice: 0,
  maxPrice: DEFAULT_MAX_PRICE,
};

describe('buildProductParams', () => {
  it('omits maxPrice when left at the slider ceiling (no default upper filter)', () => {
    const params = buildProductParams(base);
    expect(params).not.toHaveProperty('maxPrice');
    expect(params).toEqual({ page: 1, limit: 12, sortBy: 'createdAt', sortOrder: 'DESC' });
  });

  it('sends maxPrice only when the user lowers it below the ceiling', () => {
    expect(buildProductParams({ ...base, maxPrice: 5_000_000 })).toHaveProperty('maxPrice', 5_000_000);
  });

  it('omits minPrice when zero and sends it when positive', () => {
    expect(buildProductParams(base)).not.toHaveProperty('minPrice');
    expect(buildProductParams({ ...base, minPrice: 100_000 })).toHaveProperty('minPrice', 100_000);
  });

  it('omits empty search and id filters', () => {
    const params = buildProductParams(base);
    expect(params).not.toHaveProperty('search');
    expect(params).not.toHaveProperty('categoryIds');
    expect(params).not.toHaveProperty('brandIds');
    expect(params).not.toHaveProperty('provinceIds');
  });

  it('includes active search and id filters', () => {
    const params = buildProductParams({
      ...base,
      search: 'tai nghe',
      categoryIds: [2, 3],
      brandIds: [28],
      provinceIds: [201],
    });
    expect(params).toMatchObject({ search: 'tai nghe', categoryIds: [2, 3], brandIds: [28], provinceIds: [201] });
  });
});
