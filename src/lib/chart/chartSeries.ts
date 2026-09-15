import { ORDER_STATUS_META, ORDER_STATUSES } from '@/lib/domain/orderStatus';
import { ORDER_STATUS_CHART_COLOR } from './chartTheme';
import type { OrderStatus } from '@/types';

/**
 * One categorical datum: a labelled, coloured value. Every doughnut and ranked
 * bar in the app speaks this shape, so the chart components stay domain-free
 * and each feature keeps its own mapping in a pure, testable function.
 */
export interface ChartSlice {
  /** Stable identity for React keys — unique within a series. */
  key: string;
  /** Human label shown in the legend and tooltip. */
  label: string;
  value: number;
  /** Hex from `chartTheme.ts`. */
  color: string;
}

/**
 * Turn per-status order counts into doughnut slices.
 *
 * Accepts both `OrderAnalytics['statusDistribution']` (every status present)
 * and `OrderStatusCounts` (F2 return statuses optional, plus an `all` total
 * that must NOT become a slice — iterating `ORDER_STATUSES` rather than
 * `Object.entries` is what keeps `all` out of the chart).
 *
 * Zero-count statuses are dropped: Chart.js still allocates a legend entry and
 * a hover target for a 0-value arc, which reads as a bug to the user. Ordered
 * by count descending so the largest slice leads the legend, with the canonical
 * status order breaking ties for a stable render.
 */
export function orderStatusSlices(
  counts: Partial<Record<OrderStatus, number>> | undefined,
): ChartSlice[] {
  if (!counts) return [];
  return ORDER_STATUSES.filter((status) => (counts[status] ?? 0) > 0)
    .map((status) => ({
      key: status,
      label: ORDER_STATUS_META[status].label,
      value: counts[status] ?? 0,
      color: ORDER_STATUS_CHART_COLOR[status],
    }))
    .sort((a, b) => b.value - a.value);
}

/** Sum of a series — the denominator for percentage labels. */
export function sliceTotal(slices: readonly ChartSlice[]): number {
  return slices.reduce((acc, slice) => acc + slice.value, 0);
}

/**
 * Share of the total as a percentage, rounded to one decimal.
 * Returns 0 when the total is 0 rather than `NaN`, which Chart.js would
 * happily render as the string "NaN%" inside a tooltip.
 */
export function slicePercent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 1000) / 10;
}
