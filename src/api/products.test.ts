import { describe, it, expect } from 'vitest';
import { buildProductListQuery, batchProductIds, MAX_BATCH_PRODUCT_IDS } from './products';

describe('buildProductListQuery', () => {
  it('returns an empty string for empty params', () => {
    expect(buildProductListQuery({})).toBe('');
  });

  it('appends categoryIds as a repeated plural key per value', () => {
    expect(buildProductListQuery({ categoryIds: [16, 18] })).toBe('categoryIds=16&categoryIds=18');
  });

  it('appends brandIds as a repeated plural key per value', () => {
    expect(buildProductListQuery({ brandIds: [28] })).toBe('brandIds=28');
  });

  it('never emits the singular keys the gateway whitelist strips', () => {
    const qs = buildProductListQuery({ categoryIds: [2], brandIds: [3] });
    expect(qs).not.toMatch(/categoryId=/);
    expect(qs).not.toMatch(/brandId=/);
  });

  it('never emits bracket syntax (categoryIds[] is an unknown key to the gateway)', () => {
    const qs = buildProductListQuery({ categoryIds: [2, 3] });
    expect(qs).not.toContain('%5B%5D');
    expect(qs).not.toContain('[]');
  });

  it('keeps scalar params alongside array filters and skips empty values', () => {
    const qs = buildProductListQuery({
      page: 2,
      limit: 12,
      search: '',
      categoryIds: [16],
    });
    expect(qs).toBe('page=2&limit=12&categoryIds=16');
  });
});

describe('batchProductIds', () => {
  it('returns no batches for an empty id list', () => {
    expect(batchProductIds([])).toEqual([]);
  });

  it('keeps a small id set as a single batch', () => {
    expect(batchProductIds([3, 1, 2])).toEqual([[3, 1, 2]]);
  });

  it('dedupes ids so duplicates (same product, different SKU) do not waste batch slots', () => {
    expect(batchProductIds([1, 2, 1, 3, 2])).toEqual([[1, 2, 3]]);
  });

  it('keeps exactly 50 distinct ids in one batch', () => {
    const ids = Array.from({ length: MAX_BATCH_PRODUCT_IDS }, (_, i) => i + 1);
    expect(batchProductIds(ids)).toEqual([ids]);
  });

  it('splits 51+ distinct ids into batches of at most 50 covering every id', () => {
    const ids = Array.from({ length: 120 }, (_, i) => i + 1);
    const batches = batchProductIds(ids);
    expect(batches.map((b) => b.length)).toEqual([50, 50, 20]);
    expect(batches.flat()).toEqual(ids);
  });
});
