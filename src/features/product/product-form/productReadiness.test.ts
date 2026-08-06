import { describe, it, expect } from 'vitest';
import { missingFields, isFormReady } from './productReadiness';

const base = {
  name: 'Widget',
  categoryIds: [1],
  hasVariations: false,
  singlePrice: '1000',
};

describe('missingFields', () => {
  it('is empty when name, category, and price are present', () => {
    expect(missingFields(base)).toEqual([]);
  });

  it('never lists SKU — it is optional', () => {
    // A fully-blank base SKU used to force a "SKU" entry; it must not anymore.
    expect(missingFields({ ...base })).not.toContain('SKU');
  });

  it('lists a blank name', () => {
    expect(missingFields({ ...base, name: '   ' })).toContain('tên');
  });

  it('lists an empty category selection', () => {
    expect(missingFields({ ...base, categoryIds: [] })).toContain('danh mục');
  });

  it('lists a missing price for a single-price product', () => {
    expect(missingFields({ ...base, singlePrice: '' })).toContain('giá');
    expect(missingFields({ ...base, singlePrice: '0' })).toContain('giá');
  });

  it('does not require a single price when the product has variations', () => {
    expect(
      missingFields({ ...base, hasVariations: true, singlePrice: '' }),
    ).toEqual([]);
  });

  it('reports missing fields in display order', () => {
    expect(
      missingFields({
        name: '',
        categoryIds: [],
        hasVariations: false,
        singlePrice: '',
      }),
    ).toEqual(['tên', 'danh mục', 'giá']);
  });
});

describe('isFormReady', () => {
  it('is true when nothing required is missing', () => {
    expect(isFormReady(base)).toBe(true);
  });

  it('is ready without a SKU', () => {
    // SKU is not part of the readiness field set at all.
    expect(isFormReady(base)).toBe(true);
  });

  it('is false when a required field is missing', () => {
    expect(isFormReady({ ...base, name: '' })).toBe(false);
  });
});
