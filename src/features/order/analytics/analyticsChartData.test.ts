import { describe, it, expect } from 'vitest';
import { revenueTrend, topProductSeries } from './analyticsChartData';
import type { RevenuePoint, TopProductStat } from '@/types';

function product(partial: Partial<TopProductStat>): TopProductStat {
  return {
    productId: 'prod_1',
    productName: 'Sản phẩm mẫu',
    quantitySold: 1,
    revenue: 1000,
    ...partial,
  };
}

describe('topProductSeries', () => {
  it('ranks products by quantity sold, highest first', () => {
    const { slices } = topProductSeries([
      product({ productId: 'prod_a', productName: 'A', quantitySold: 2 }),
      product({ productId: 'prod_b', productName: 'B', quantitySold: 9 }),
      product({ productId: 'prod_c', productName: 'C', quantitySold: 5 }),
    ]);
    expect(slices.map((s) => s.label)).toEqual(['B', 'C', 'A']);
  });

  it('keeps revenues index-aligned with the sorted slices', () => {
    const { slices, revenues } = topProductSeries([
      product({ productId: 'prod_a', productName: 'A', quantitySold: 2, revenue: 200 }),
      product({ productId: 'prod_b', productName: 'B', quantitySold: 9, revenue: 900 }),
    ]);
    expect(slices.map((s) => s.label)).toEqual(['B', 'A']);
    expect(revenues).toEqual([900, 200]);
  });

  it('gives deleted products (null productId) distinct keys', () => {
    // IDLEAK-02: productId is null once the product is gone. Two of them must
    // not collide on one React key.
    const { slices } = topProductSeries([
      product({ productId: null, productName: 'Đã xóa 1', quantitySold: 4 }),
      product({ productId: null, productName: 'Đã xóa 2', quantitySold: 3 }),
    ]);
    const keys = slices.map((s) => s.key);
    expect(new Set(keys).size).toBe(2);
  });

  it('assigns every slice a colour', () => {
    const { slices } = topProductSeries([
      product({ productId: 'prod_a', quantitySold: 3 }),
      product({ productId: 'prod_b', quantitySold: 1 }),
    ]);
    for (const slice of slices) {
      expect(slice.color).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('returns empty arrays for no products', () => {
    expect(topProductSeries([])).toEqual({ slices: [], revenues: [] });
  });
});

describe('revenueTrend', () => {
  function point(partial: Partial<RevenuePoint>): RevenuePoint {
    return { period: '2026-09-01', revenue: 0, orderCount: 0, ...partial };
  }

  it('splits points into index-aligned arrays in source order', () => {
    const trend = revenueTrend([
      point({ period: '2026-09-01', revenue: 100, orderCount: 2 }),
      point({ period: '2026-09-02', revenue: 250, orderCount: 5 }),
    ]);
    expect(trend).toEqual({
      labels: ['2026-09-01', '2026-09-02'],
      revenue: [100, 250],
      orderCount: [2, 5],
    });
  });

  it('preserves the backend period label verbatim', () => {
    // Month-interval periods come through as "2026-09" — no client re-parsing.
    expect(revenueTrend([point({ period: '2026-09' })]).labels).toEqual(['2026-09']);
  });

  it('handles an empty range', () => {
    expect(revenueTrend([])).toEqual({ labels: [], revenue: [], orderCount: [] });
  });
});
