import { describe, it, expect } from 'vitest';
import { orderStatusSlices, slicePercent, sliceTotal } from './chartSeries';
import { ORDER_STATUS_CHART_COLOR } from './chartTheme';
import type { OrderStatusCounts } from '@/types';

describe('orderStatusSlices', () => {
  it('drops zero-count statuses so no empty arc gets a legend entry', () => {
    const slices = orderStatusSlices({ pending: 3, completed: 0, canceled: 0 });
    expect(slices.map((s) => s.key)).toEqual(['pending']);
  });

  it('orders slices by count descending', () => {
    const slices = orderStatusSlices({ pending: 2, completed: 9, canceled: 5 });
    expect(slices.map((s) => s.key)).toEqual(['completed', 'canceled', 'pending']);
  });

  it('labels and colours each slice from the shared status metadata', () => {
    const [slice] = orderStatusSlices({ delivering: 4 });
    expect(slice).toEqual({
      key: 'delivering',
      label: 'Đang giao',
      value: 4,
      color: ORDER_STATUS_CHART_COLOR.delivering,
    });
  });

  it('never turns the OrderStatusCounts `all` total into a slice', () => {
    // `all` is a grand total, not a status — charting it would double every
    // count and swamp the real slices.
    const counts: OrderStatusCounts = {
      all: 12,
      pending: 5,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivering: 0,
      completed: 7,
      canceled: 0,
    };
    const slices = orderStatusSlices(counts);
    expect(slices.map((s) => s.key)).toEqual(['completed', 'pending']);
    expect(sliceTotal(slices)).toBe(12);
  });

  it('handles the optional F2 return statuses being absent', () => {
    const counts: OrderStatusCounts = {
      all: 1,
      pending: 1,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivering: 0,
      completed: 0,
      canceled: 0,
    };
    expect(orderStatusSlices(counts).map((s) => s.key)).toEqual(['pending']);
  });

  it('includes the F2 return statuses when the endpoint does send them', () => {
    const slices = orderStatusSlices({ refunded: 2, return_requested: 6 });
    expect(slices.map((s) => s.key)).toEqual(['return_requested', 'refunded']);
  });

  it('returns an empty series while the counts query is still pending', () => {
    expect(orderStatusSlices(undefined)).toEqual([]);
  });
});

describe('sliceTotal', () => {
  it('sums an empty series to zero', () => {
    expect(sliceTotal([])).toBe(0);
  });
});

describe('slicePercent', () => {
  it('rounds to one decimal place', () => {
    expect(slicePercent(1, 3)).toBe(33.3);
  });

  it('returns 0 instead of NaN when the total is zero', () => {
    expect(slicePercent(0, 0)).toBe(0);
  });

  it('reports a full share as 100', () => {
    expect(slicePercent(7, 7)).toBe(100);
  });
});
