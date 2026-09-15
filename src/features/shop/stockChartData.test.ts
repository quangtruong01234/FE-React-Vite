import { describe, it, expect } from 'vitest';
import { lowStockSeries, stockHealthSlices } from './stockChartData';
import { CHART_AMBER, CHART_GREEN, CHART_RED } from '@/lib/chart/chartTheme';
import type { LowStockRow } from './lowStock';

function row(partial: Partial<LowStockRow>): LowStockRow {
  return {
    id: 1,
    productId: 'prod_1',
    name: 'Sản phẩm mẫu',
    sku: 'SKU-1',
    availableStock: 2,
    minimumStock: 5,
    ...partial,
  };
}

describe('lowStockSeries', () => {
  it('keeps the backend ordering (most urgent first)', () => {
    const { slices } = lowStockSeries([
      row({ id: 1, name: 'A', availableStock: 0 }),
      row({ id: 2, name: 'B', availableStock: 3 }),
    ]);
    expect(slices.map((s) => s.label)).toEqual(['A', 'B']);
  });

  it('keeps minimums index-aligned with the slices', () => {
    const { slices, minimums } = lowStockSeries([
      row({ id: 1, name: 'A', availableStock: 0, minimumStock: 4 }),
      row({ id: 2, name: 'B', availableStock: 3, minimumStock: 9 }),
    ]);
    expect(slices.map((s) => s.value)).toEqual([0, 3]);
    expect(minimums).toEqual([4, 9]);
  });

  it('colours an out-of-stock row red and a merely-low row amber', () => {
    const { slices } = lowStockSeries([
      row({ id: 1, availableStock: 0 }),
      row({ id: 2, availableStock: 2 }),
    ]);
    expect(slices[0].color).toBe(CHART_RED);
    expect(slices[1].color).toBe(CHART_AMBER);
  });

  it('caps the number of bars so the axis stays readable', () => {
    const rows = Array.from({ length: 20 }, (_, i) => row({ id: i + 1, name: `P${i}` }));
    expect(lowStockSeries(rows).slices).toHaveLength(8);
    expect(lowStockSeries(rows, 3).slices).toHaveLength(3);
  });

  it('returns nothing for an empty list', () => {
    expect(lowStockSeries([])).toEqual({ slices: [], minimums: [] });
  });
});

describe('stockHealthSlices', () => {
  it('splits the catalogue into healthy and low buckets', () => {
    const slices = stockHealthSlices(10, 3);
    expect(slices.map((s) => [s.label, s.value])).toEqual([
      ['Đủ hàng', 7],
      ['Sắp hết', 3],
    ]);
    expect(slices[0].color).toBe(CHART_GREEN);
  });

  it('omits the low bucket entirely when nothing is running low', () => {
    const slices = stockHealthSlices(4, 0);
    expect(slices.map((s) => s.key)).toEqual(['healthy']);
  });

  it('never produces a negative arc when low-stock outruns the loaded page', () => {
    // The product list is paginated; the low-stock endpoint is not.
    const slices = stockHealthSlices(2, 5);
    expect(slices.map((s) => [s.key, s.value])).toEqual([['low', 5]]);
    expect(slices.every((s) => s.value >= 0)).toBe(true);
  });

  it('renders a placeholder arc for an empty catalogue instead of a blank ring', () => {
    const slices = stockHealthSlices(0, 0);
    expect(slices).toHaveLength(1);
    expect(slices[0].key).toBe('none');
  });
});
