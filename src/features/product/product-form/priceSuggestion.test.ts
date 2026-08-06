import { describe, it, expect } from 'vitest';
import type { PriceSuggestion } from '@/types';
import { buildPriceSuggestionParams, priceSuggestionView } from './priceSuggestion';

const fullData: PriceSuggestion = {
  sufficientData: true,
  sampleSize: 7,
  median: 1_500_000,
  p25: 1_200_000,
  p75: 1_800_000,
  min: 900_000,
  max: 2_500_000,
};

describe('buildPriceSuggestionParams', () => {
  it('returns null when no category is selected', () => {
    expect(buildPriceSuggestionParams([], 3, 'new')).toBeNull();
  });

  it('anchors on the first selected category and includes brand + condition', () => {
    expect(buildPriceSuggestionParams([16, 18], 3, 'used')).toEqual({
      categoryId: 16,
      brandId: 3,
      condition: 'used',
    });
  });

  it('omits brandId when no brand is selected', () => {
    const params = buildPriceSuggestionParams([16], null, 'new');
    expect(params).toEqual({ categoryId: 16, condition: 'new' });
    expect(params).not.toHaveProperty('brandId');
  });
});

describe('priceSuggestionView', () => {
  it('hides while there is no data yet', () => {
    expect(priceSuggestionView(undefined)).toBeNull();
  });

  it('hides when the catalog has too few samples', () => {
    expect(
      priceSuggestionView({
        sufficientData: false,
        sampleSize: 2,
        median: null,
        p25: null,
        p75: null,
        min: null,
        max: null,
      }),
    ).toBeNull();
  });

  it('hides on a degenerate response missing stats despite sufficientData', () => {
    expect(priceSuggestionView({ ...fullData, median: null })).toBeNull();
    expect(priceSuggestionView({ ...fullData, p25: null })).toBeNull();
    expect(priceSuggestionView({ ...fullData, p75: null })).toBeNull();
  });

  it('maps a sufficient response to formatted labels and the raw median', () => {
    const view = priceSuggestionView(fullData);
    expect(view).not.toBeNull();
    expect(view?.median).toBe(1_500_000);
    expect(view?.sampleSize).toBe(7);
    // vi-VN grouping — assert digits without pinning the exact separator glyph.
    expect(view?.medianLabel.replace(/[^\d]/g, '')).toBe('1500000');
    const [lo, hi] = (view?.rangeLabel ?? '').split('–').map(s => s.replace(/[^\d]/g, ''));
    expect(lo).toBe('1200000');
    expect(hi).toBe('1800000');
  });
});
