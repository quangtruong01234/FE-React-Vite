import { describe, it, expect } from 'vitest';
import { buildProductListQuery } from './products';

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
