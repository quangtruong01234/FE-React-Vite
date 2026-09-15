import { useMemo, type ReactElement } from 'react';
import { DollarSign, Package, Receipt, TrendingUp } from 'lucide-react';
import { cn, formatPrice, formatVnd } from '@/lib/format/utils';
import { toApiError } from '@/lib/http/apiError';
import { ApiErrorState } from '@/components/shared/ApiErrorState';
import { ChartFrame } from '@/components/shared/charts/ChartFrame';
import { ChartLegend } from '@/components/shared/charts/ChartLegend';
import { DoughnutChart } from '@/components/shared/charts/DoughnutChart';
import { RankedBarChart } from '@/components/shared/charts/RankedBarChart';
import { TrendAreaChart, type TrendSeries } from '@/components/shared/charts/TrendAreaChart';
import { orderStatusSlices, sliceTotal, type ChartSlice } from '@/lib/chart/chartSeries';
import { CHART_AMBER, CHART_CYAN } from '@/lib/chart/chartTheme';
import { rangePresetDates } from './analyticsRange';
import { revenueTrend, topProductSeries } from './analyticsChartData';
import type { AnalyticsFilters } from './useAnalyticsFilters';
import type { OrderAnalytics } from '@/types';

type RangePreset = '7d' | '30d' | '90d';

const RANGE_PRESETS: { key: RangePreset; label: string; days: number }[] = [
  { key: '7d', label: '7 ngày', days: 7 },
  { key: '30d', label: '30 ngày', days: 30 },
  { key: '90d', label: '90 ngày', days: 90 },
];

interface AnalyticsDashboardProps {
  data: OrderAnalytics | undefined;
  isLoading: boolean;
  /** Raw query error, if any — the dashboard normalises it itself. */
  error?: unknown;
  onRetry?: () => void;
  filters: AnalyticsFilters;
  onFiltersChange: (filters: AnalyticsFilters) => void;
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}): ReactElement {
  return (
    <div className="bg-canvas-surface border border-bdr rounded-tb-card p-4 flex items-center gap-4">
      <span className="size-10 rounded-tb-input bg-accent-amber/10 text-accent-amber grid place-items-center shrink-0">
        <Icon size={18} className="shrink-0" />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-display font-semibold text-ink-pri truncate">{value}</p>
        <p className="text-xs text-ink-sec">{label}</p>
      </div>
    </div>
  );
}

export function AnalyticsDashboard({
  data,
  isLoading,
  error,
  onRetry,
  filters,
  onFiltersChange,
}: AnalyticsDashboardProps): ReactElement {
  // The filter bar stays mounted on failure so the user can narrow the range and
  // retry; only the charts are replaced. Without this the page rendered nothing
  // at all below the heading — indistinguishable from "chưa có dữ liệu".
  const loadError = toApiError(error);

  function applyRangePreset(days: number): void {
    onFiltersChange({ ...filters, ...rangePresetDates(days) });
  }

  function clearRange(): void {
    onFiltersChange({ ...filters, from: undefined, to: undefined });
  }

  const statusSlices = useMemo(
    () => orderStatusSlices(data?.statusDistribution),
    [data?.statusDistribution],
  );

  const trend = useMemo(
    () => revenueTrend(data?.revenueOverTime ?? []),
    [data?.revenueOverTime],
  );

  const topProducts = useMemo(
    () => topProductSeries(data?.topProducts ?? []),
    [data?.topProducts],
  );

  const trendSeries = useMemo<TrendSeries[]>(
    () => [
      {
        id: 'revenue',
        label: 'Doanh thu',
        color: CHART_AMBER,
        values: trend.revenue,
        formatter: formatPrice,
      },
      {
        id: 'orderCount',
        label: 'Số đơn',
        color: CHART_CYAN,
        values: trend.orderCount,
        fill: false,
        axis: 'right',
        formatter: (value) => String(value),
      },
    ],
    [trend],
  );

  const statusTotal = sliceTotal(statusSlices);

  // Names the two lines of the trend chart; the numbers live on its axes, so the
  // legend renders keys only.
  const trendLegend: ChartSlice[] = [
    { key: 'revenue', label: 'Doanh thu', value: 0, color: CHART_AMBER },
    { key: 'orders', label: 'Số đơn', value: 0, color: CHART_CYAN },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={clearRange}
          className={cn(
            'px-3 py-1.5 rounded-tb-input border font-body text-xs transition-colors',
            !filters.from
              ? 'border-tb-amber/50 bg-tb-amber/10 text-accent-amber'
              : 'border-bdr bg-canvas-elevated text-ink-sec hover:border-tb-amber/40',
          )}
        >
          30 ngày (mặc định)
        </button>
        {RANGE_PRESETS.map(preset => (
          <button
            key={preset.key}
            onClick={() => applyRangePreset(preset.days)}
            className="px-3 py-1.5 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-sec font-body text-xs hover:border-tb-amber/40 transition-colors"
          >
            {preset.label}
          </button>
        ))}
        <div className="w-px h-5 bg-bdr mx-1" />
        {(['day', 'month'] as const).map(interval => (
          <button
            key={interval}
            onClick={() => onFiltersChange({ ...filters, interval })}
            className={cn(
              'px-3 py-1.5 rounded-tb-input border font-body text-xs transition-colors',
              filters.interval === interval
                ? 'border-tb-amber/50 bg-tb-amber/10 text-accent-amber'
                : 'border-bdr bg-canvas-elevated text-ink-sec hover:border-tb-amber/40',
            )}
          >
            {interval === 'day' ? 'Theo ngày' : 'Theo tháng'}
          </button>
        ))}
      </div>

      {!isLoading && loadError && <ApiErrorState error={loadError} onRetry={onRetry} embedded />}

      {!loadError && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Doanh thu"
              value={isLoading || !data ? '—' : formatVnd(data.summary.totalRevenue)}
              icon={DollarSign}
            />
            <StatCard
              label="Đơn hoàn thành"
              value={isLoading || !data ? '—' : String(data.summary.completedOrders)}
              icon={Package}
            />
            <StatCard
              label="Tổng đơn"
              value={isLoading || !data ? '—' : String(data.summary.totalOrders)}
              icon={Receipt}
            />
            <StatCard
              label="Giá trị đơn TB"
              value={isLoading || !data ? '—' : formatVnd(data.summary.averageOrderValue)}
              icon={TrendingUp}
            />
          </div>

          {/* Revenue over time */}
          <ChartFrame
            title="Doanh thu theo thời gian"
            subtitle={data?.interval === 'month' ? 'Theo tháng' : 'Theo ngày'}
            height={260}
            isLoading={isLoading}
            isEmpty={trend.labels.length === 0}
            emptyLabel="Chưa có dữ liệu trong khoảng thời gian này."
            footer={
              <ChartLegend layout="inline" className="mt-4" slices={trendLegend} showValues={false} />
            }
          >
            <TrendAreaChart
              labels={trend.labels}
              series={trendSeries}
              ariaLabel="Biểu đồ doanh thu và số đơn theo thời gian"
            />
          </ChartFrame>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Status distribution */}
            <ChartFrame
              title="Phân bố trạng thái đơn"
              height={200}
              isLoading={isLoading}
              isEmpty={statusSlices.length === 0}
              emptyLabel="Chưa có đơn hàng nào."
            >
              <div className="flex items-center gap-6 size-full">
                <div className="w-1/2 h-full shrink-0">
                  <DoughnutChart
                    slices={statusSlices}
                    ariaLabel="Biểu đồ phân bố trạng thái đơn hàng"
                    centerValue={String(statusTotal)}
                    centerLabel="đơn"
                  />
                </div>
                <ChartLegend slices={statusSlices} showPercent className="flex-1 min-w-0" />
              </div>
            </ChartFrame>

            {/* Top products */}
            <ChartFrame
              title="Sản phẩm bán chạy"
              height={200}
              isLoading={isLoading}
              isEmpty={topProducts.slices.length === 0}
              emptyLabel="Chưa có sản phẩm nào được bán."
            >
              <RankedBarChart
                slices={topProducts.slices}
                valueLabel="Đã bán"
                ariaLabel="Biểu đồ sản phẩm bán chạy theo số lượng"
                labelWidth={110}
                tooltipExtra={(index) => {
                  const revenue = topProducts.revenues[index];
                  return revenue == null ? undefined : `Doanh thu: ${formatVnd(revenue)}`;
                }}
              />
            </ChartFrame>
          </div>
        </>
      )}
    </div>
  );
}
