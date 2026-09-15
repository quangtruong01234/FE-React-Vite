import { CHART_AMBER, CHART_GREEN, CHART_INK_MUTED, CHART_RED } from '@/lib/chart/chartTheme';
import type { ChartSlice } from '@/lib/chart/chartSeries';
import type { LowStockRow } from './lowStock';

/** How many low-stock rows the bar chart shows before it stops being readable. */
export const LOW_STOCK_CHART_LIMIT = 8;

export interface LowStockSeries {
  slices: ChartSlice[];
  /** Each row's `minimumStock`, index-aligned with `slices`. */
  minimums: number[];
}

/**
 * The most urgent low-stock rows as ranked bars.
 *
 * Rows arrive already ordered `availableStock` ASC from the backend, so the
 * most urgent are simply the first N — re-sorting here would be redundant, but
 * the slice is capped because 40 product names down one axis is unreadable.
 *
 * Out-of-stock rows are coloured red rather than amber: "còn 0" is a different
 * problem from "sắp hết" and the chart should say so at a glance.
 */
export function lowStockSeries(
  rows: readonly LowStockRow[],
  limit = LOW_STOCK_CHART_LIMIT,
): LowStockSeries {
  const shown = rows.slice(0, Math.max(0, limit));
  return {
    slices: shown.map((row) => ({
      key: String(row.id),
      label: row.name,
      value: row.availableStock,
      color: row.availableStock <= 0 ? CHART_RED : CHART_AMBER,
    })),
    minimums: shown.map((row) => row.minimumStock),
  };
}

/**
 * Stock health across the catalogue: how many products are comfortable versus
 * running low.
 *
 * `lowStockCount` can exceed `totalProducts` when the product list is paginated
 * but the low-stock endpoint is not, so the healthy bucket is floored at 0 —
 * otherwise Chart.js would receive a negative arc and render a wedge that
 * overlaps its neighbour.
 */
export function stockHealthSlices(
  totalProducts: number,
  lowStockCount: number,
): ChartSlice[] {
  const low = Math.max(0, lowStockCount);
  const healthy = Math.max(0, totalProducts - low);
  const slices: ChartSlice[] = [];
  if (healthy > 0) {
    slices.push({ key: 'healthy', label: 'Đủ hàng', value: healthy, color: CHART_GREEN });
  }
  if (low > 0) {
    slices.push({ key: 'low', label: 'Sắp hết', value: low, color: CHART_AMBER });
  }
  // An all-zero catalogue still needs one arc, else the ring vanishes entirely
  // and the card reads as broken rather than empty.
  if (slices.length === 0) {
    slices.push({ key: 'none', label: 'Chưa có sản phẩm', value: 1, color: CHART_INK_MUTED });
  }
  return slices;
}
