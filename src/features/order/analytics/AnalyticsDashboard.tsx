import type { ReactElement } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DollarSign, Package, Receipt, TrendingUp } from 'lucide-react';
import { cn, formatPrice, formatVnd } from '@/lib/format/utils';
import { ORDER_STATUS_META } from '@/lib/domain/orderStatus';
import { rangePresetDates } from './analyticsRange';
import type { AnalyticsFilters } from './useAnalyticsFilters';
import type { OrderAnalytics, OrderStatus } from '@/types';

/** Literal hex values (recharts renders SVG — Tailwind classes do not apply). */
const STATUS_CHART_COLOR: Record<OrderStatus, string> = {
  pending: '#F59E0B',
  confirmed: '#06b6d4',
  processing: '#8b5cf6',
  shipped: '#3b82f6',
  delivering: '#3b82f6',
  completed: '#10b981',
  canceled: '#EF4444',
  return_requested: '#F59E0B',
  refunded: '#8b5cf6',
};

const CHART_GRID_COLOR = '#27272A';
const CHART_AXIS_COLOR = '#A1A1AA';

type RangePreset = '7d' | '30d' | '90d';

const RANGE_PRESETS: { key: RangePreset; label: string; days: number }[] = [
  { key: '7d', label: '7 ngày', days: 7 },
  { key: '30d', label: '30 ngày', days: 30 },
  { key: '90d', label: '90 ngày', days: 90 },
];

interface AnalyticsDashboardProps {
  data: OrderAnalytics | undefined;
  isLoading: boolean;
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

export function AnalyticsDashboard({ data, isLoading, filters, onFiltersChange }: AnalyticsDashboardProps): ReactElement {
  function applyRangePreset(days: number): void {
    onFiltersChange({ ...filters, ...rangePresetDates(days) });
  }

  function clearRange(): void {
    onFiltersChange({ ...filters, from: undefined, to: undefined });
  }

  const statusEntries = data
    ? (Object.entries(data.statusDistribution) as [OrderStatus, number][]).filter(([, count]) => count > 0)
    : [];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={clearRange}
          className={cn(
            'px-3 py-1.5 rounded-tb-input border font-body text-xs transition-colors',
            !filters.from ? 'border-accent-amber/50 bg-accent-amber/10 text-accent-amber' : 'border-bdr bg-canvas-elevated text-ink-sec hover:border-accent-amber/40',
          )}
        >
          30 ngày (mặc định)
        </button>
        {RANGE_PRESETS.map(preset => (
          <button
            key={preset.key}
            onClick={() => applyRangePreset(preset.days)}
            className="px-3 py-1.5 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-sec font-body text-xs hover:border-accent-amber/40 transition-colors"
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
              filters.interval === interval ? 'border-accent-amber/50 bg-accent-amber/10 text-accent-amber' : 'border-bdr bg-canvas-elevated text-ink-sec hover:border-accent-amber/40',
            )}
          >
            {interval === 'day' ? 'Theo ngày' : 'Theo tháng'}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="py-16 text-center font-body text-sm text-ink-muted">Đang tải dữ liệu...</div>
      )}

      {!isLoading && data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Doanh thu" value={formatVnd(data.summary.totalRevenue)} icon={DollarSign} />
            <StatCard label="Đơn hoàn thành" value={String(data.summary.completedOrders)} icon={Package} />
            <StatCard label="Tổng đơn" value={String(data.summary.totalOrders)} icon={Receipt} />
            <StatCard label="Giá trị đơn TB" value={formatVnd(data.summary.averageOrderValue)} icon={TrendingUp} />
          </div>

          {/* Revenue over time */}
          <section className="bg-canvas-surface border border-bdr rounded-tb-card p-5">
            <h2 className="font-display font-semibold text-sm text-ink-pri mb-4">Doanh thu theo thời gian</h2>
            {data.revenueOverTime.length === 0 ? (
              <p className="py-10 text-center font-body text-sm text-ink-muted">Chưa có dữ liệu trong khoảng thời gian này.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.revenueOverTime}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
                  <XAxis dataKey="period" tick={{ fill: CHART_AXIS_COLOR, fontSize: 11 }} axisLine={{ stroke: CHART_GRID_COLOR }} tickLine={false} />
                  <YAxis
                    tick={{ fill: CHART_AXIS_COLOR, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => formatPrice(v)}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{ background: '#1C1C1E', border: '1px solid #27272A', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#FFFFFF' }}
                    formatter={(value, name) => [
                      name === 'revenue' ? formatVnd(Number(value)) : value,
                      name === 'revenue' ? 'Doanh thu' : 'Số đơn',
                    ]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#F59E0B" fill="url(#revenueFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </section>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Status distribution */}
            <section className="bg-canvas-surface border border-bdr rounded-tb-card p-5">
              <h2 className="font-display font-semibold text-sm text-ink-pri mb-4">Phân bố trạng thái đơn</h2>
              {statusEntries.length === 0 ? (
                <p className="py-10 text-center font-body text-sm text-ink-muted">Chưa có đơn hàng nào.</p>
              ) : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie
                        data={statusEntries.map(([status, count]) => ({ status, count }))}
                        dataKey="count"
                        nameKey="status"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {statusEntries.map(([status]) => (
                          <Cell key={status} fill={STATUS_CHART_COLOR[status]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#1C1C1E', border: '1px solid #27272A', borderRadius: 8, fontSize: 12 }}
                        formatter={(value, _name, entry) => [value, ORDER_STATUS_META[(entry.payload as { status: OrderStatus }).status].label]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="flex-1 space-y-2">
                    {statusEntries.map(([status, count]) => (
                      <li key={status} className="flex items-center gap-2 text-xs font-body">
                        <span className="size-2.5 rounded-full shrink-0" style={{ background: STATUS_CHART_COLOR[status] }} />
                        <span className="flex-1 text-ink-sec truncate">{ORDER_STATUS_META[status].label}</span>
                        <span className="font-semibold text-ink-pri">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* Top products */}
            <section className="bg-canvas-surface border border-bdr rounded-tb-card p-5">
              <h2 className="font-display font-semibold text-sm text-ink-pri mb-4">Sản phẩm bán chạy</h2>
              {data.topProducts.length === 0 ? (
                <p className="py-10 text-center font-body text-sm text-ink-muted">Chưa có sản phẩm nào được bán.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.topProducts} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} horizontal={false} />
                    <XAxis type="number" tick={{ fill: CHART_AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="productName"
                      tick={{ fill: CHART_AXIS_COLOR, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={110}
                      tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 16)}…` : v)}
                    />
                    <Tooltip
                      contentStyle={{ background: '#1C1C1E', border: '1px solid #27272A', borderRadius: 8, fontSize: 12 }}
                      formatter={(value, name) => [
                        name === 'quantitySold' ? value : formatVnd(Number(value)),
                        name === 'quantitySold' ? 'Đã bán' : 'Doanh thu',
                      ]}
                    />
                    <Bar dataKey="quantitySold" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
