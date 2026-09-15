import { categoricalColor } from '@/lib/chart/chartTheme';
import type { ChartSlice } from '@/lib/chart/chartSeries';
import type { RevenuePoint, TopProductStat } from '@/types';

export interface TopProductSeries {
  slices: ChartSlice[];
  /** Revenue per bar, index-aligned with `slices` — the tooltip's second line. */
  revenues: number[];
}

/**
 * Best-selling products as ranked bars, highest first.
 *
 * Slices and revenues are produced by a SINGLE sort and returned together:
 * sorting twice in two functions would silently pair a bar with another
 * product's revenue the moment the two comparators drifted apart.
 *
 * Keys cannot come from `productId` alone — IDLEAK-02 makes it `null` once a
 * product is deleted, so two deleted products would collide on one React key.
 * The original index is folded in to keep keys unique regardless.
 */
export function topProductSeries(products: readonly TopProductStat[]): TopProductSeries {
  const ranked = products
    .map((product, index) => ({ product, index }))
    .sort((a, b) => b.product.quantitySold - a.product.quantitySold);

  return {
    slices: ranked.map(({ product, index }, rank) => ({
      key: product.productId ?? `deleted-${index}`,
      label: product.productName,
      value: product.quantitySold,
      color: categoricalColor(rank),
    })),
    revenues: ranked.map(({ product }) => product.revenue),
  };
}

export interface RevenueTrend {
  labels: string[];
  revenue: number[];
  orderCount: number[];
}

/**
 * Split the time series into the parallel arrays Chart.js wants.
 *
 * `period` arrives pre-formatted from the backend and is used verbatim as a
 * category label — see `TrendAreaChart` for why there is no time scale here.
 */
export function revenueTrend(points: readonly RevenuePoint[]): RevenueTrend {
  return {
    labels: points.map((p) => p.period),
    revenue: points.map((p) => p.revenue),
    orderCount: points.map((p) => p.orderCount),
  };
}
