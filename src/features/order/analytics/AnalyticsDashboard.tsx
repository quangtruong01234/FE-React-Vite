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
import { rangePresetDates } from './analyticsRange';
import { revenueTrend, topProductSeries } from './analyticsChartData';
import type { AnalyticsFilters } from './useAnalyticsFilters';
import { analyticsMessages } from './analytics.i18n';
import { useT } from '@/hooks/ui/useT';
import { useLanguage } from '@/context/useLanguage';
import type { OrderAnalytics } from '@/types';

type RangePreset = '7d' | '30d' | '90d';

const RANGE_PRESETS: { key: RangePreset; days: number }[] = [
  { key: '7d', days: 7 },
  { key: '30d', days: 30 },
  { key: '90d', days: 90 },
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
      <span className="size-10 rounded-tb-input bg-tb-amber/10 text-accent-amber grid place-items-center shrink-0">
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
  const t = useT(analyticsMessages);
  const { lang } = useLanguage();

  function applyRangePreset(days: number): void {
    onFiltersChange({ ...filters, ...rangePresetDates(days) });
  }

  function clearRange(): void {
    onFiltersChange({ ...filters, from: undefined, to: undefined });
  }

  const statusSlices = useMemo(
    () => orderStatusSlices(data?.statusDistribution, lang),
    [data?.statusDistribution, lang],
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
        label: t('revenue'),
        color: 'amber',
        values: trend.revenue,
        formatter: (n: number) => formatPrice(n, lang),
      },
      {
        id: 'orderCount',
        label: t('orderCount'),
        color: 'cyan',
        values: trend.orderCount,
        fill: false,
        axis: 'right',
        formatter: (value) => String(value),
      },
    ],
    [trend, t, lang],
  );

  const statusTotal = sliceTotal(statusSlices);

  // Names the two lines of the trend chart; the numbers live on its axes, so the
  // legend renders keys only.
  const trendLegend: ChartSlice[] = [
    { key: 'revenue', label: t('revenue'), value: 0, color: 'amber' },
    { key: 'orders', label: t('orderCount'), value: 0, color: 'cyan' },
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
          {t('defaultRange')}
        </button>
        {RANGE_PRESETS.map(preset => (
          <button
            key={preset.key}
            onClick={() => applyRangePreset(preset.days)}
            className="px-3 py-1.5 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-sec font-body text-xs hover:border-tb-amber/40 transition-colors"
          >
            {t('daysPreset', { n: preset.days })}
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
            {interval === 'day' ? t('byDay') : t('byMonth')}
          </button>
        ))}
      </div>

      {!isLoading && loadError && <ApiErrorState error={loadError} onRetry={onRetry} embedded />}

      {!loadError && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label={t('revenue')}
              value={isLoading || !data ? '—' : formatVnd(data.summary.totalRevenue, lang)}
              icon={DollarSign}
            />
            <StatCard
              label={t('completedOrders')}
              value={isLoading || !data ? '—' : String(data.summary.completedOrders)}
              icon={Package}
            />
            <StatCard
              label={t('totalOrders')}
              value={isLoading || !data ? '—' : String(data.summary.totalOrders)}
              icon={Receipt}
            />
            <StatCard
              label={t('avgOrderValue')}
              value={isLoading || !data ? '—' : formatVnd(data.summary.averageOrderValue, lang)}
              icon={TrendingUp}
            />
          </div>

          {/* Revenue over time */}
          <ChartFrame
            title={t('revenueOverTime')}
            subtitle={data?.interval === 'month' ? t('byMonth') : t('byDay')}
            height={260}
            isLoading={isLoading}
            isEmpty={trend.labels.length === 0}
            emptyLabel={t('noDataRange')}
            footer={
              <ChartLegend layout="inline" className="mt-4" slices={trendLegend} showValues={false} />
            }
          >
            <TrendAreaChart
              labels={trend.labels}
              series={trendSeries}
              ariaLabel={t('trendAria')}
            />
          </ChartFrame>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Status distribution */}
            <ChartFrame
              title={t('statusDistribution')}
              height={200}
              isLoading={isLoading}
              isEmpty={statusSlices.length === 0}
              emptyLabel={t('noOrders')}
            >
              <div className="flex items-center gap-6 size-full">
                <div className="w-1/2 h-full shrink-0">
                  <DoughnutChart
                    slices={statusSlices}
                    ariaLabel={t('statusAria')}
                    centerValue={String(statusTotal)}
                    centerLabel={t('ordersUnit')}
                  />
                </div>
                <ChartLegend slices={statusSlices} showPercent className="flex-1 min-w-0" />
              </div>
            </ChartFrame>

            {/* Top products */}
            <ChartFrame
              title={t('topProducts')}
              height={200}
              isLoading={isLoading}
              isEmpty={topProducts.slices.length === 0}
              emptyLabel={t('noSales')}
            >
              <RankedBarChart
                slices={topProducts.slices}
                valueLabel={t('sold')}
                ariaLabel={t('topAria')}
                labelWidth={110}
                tooltipExtra={(index) => {
                  const revenue = topProducts.revenues[index];
                  return revenue == null ? undefined : t('revenueTooltip', { amount: formatVnd(revenue, lang) });
                }}
              />
            </ChartFrame>
          </div>
        </>
      )}
    </div>
  );
}
