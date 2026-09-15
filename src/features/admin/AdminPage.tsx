import { type ReactElement, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Users, ShoppingBag } from 'lucide-react';
import { cn, formatPrice, formatVnd } from '@/lib/format/utils';
import { formatDate } from '@/lib/format/time';
import { userDisplayName } from '@/lib/format/user';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import { toApiError } from '@/lib/http/apiError';
import { TableErrorRow } from '@/components/shared/TableErrorRow';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { InvoiceDownloadButton } from '@/features/order/InvoiceDownloadButton';
import { ChartFrame } from '@/components/shared/charts/ChartFrame';
import { ChartLegend } from '@/components/shared/charts/ChartLegend';
import { DoughnutChart } from '@/components/shared/charts/DoughnutChart';
import { TrendAreaChart, type TrendSeries } from '@/components/shared/charts/TrendAreaChart';
import { orderStatusSlices, sliceTotal } from '@/lib/chart/chartSeries';
import { CHART_AMBER } from '@/lib/chart/chartTheme';
import { revenueTrend } from '@/features/order/analytics/analyticsChartData';
import type { AnalyticsQueryParams } from '@/types';

const USERS_PER_PAGE = 20;

/**
 * Module-level so the object identity is stable: an inline literal would be a
 * fresh value in the query key on every render. Omitting `from`/`to` lets the
 * backend apply its own last-30-days default — the same window the dedicated
 * `/admin/analytics` page opens on.
 */
const OVERVIEW_RANGE: AnalyticsQueryParams = { interval: 'day' };

export default function AdminPage(): ReactElement {
  const [usersPage, setUsersPage] = useState(1);

  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersRawError,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: queryKeys.orders.admin,
    queryFn: () => api.orders.getAdminOrders(1, 10),
  });

  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersRawError,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: queryKeys.users.list(usersPage, USERS_PER_PAGE),
    queryFn: () => api.users.getPaginated(usersPage, USERS_PER_PAGE),
    // Keep the previous page rendered while the next one loads (no empty flash).
    placeholderData: keepPreviousData,
  });

  // Platform-wide analytics for the overview charts. Its own query, so a failure
  // here leaves the tables below untouched (see the per-section rule underneath).
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: queryKeys.orders.adminAnalytics(OVERVIEW_RANGE),
    queryFn: () => api.orders.getAdminAnalytics(OVERVIEW_RANGE),
  });

  // Each section fails on its own: a broken user list must not blank the orders
  // table, and neither may report "không có … nào" for a request that never
  // answered. The stat cards keep their "—" placeholder rather than showing 0.
  const ordersError = toApiError(ordersRawError);
  const usersError = toApiError(usersRawError);

  const trend = useMemo(
    () => revenueTrend(analytics?.revenueOverTime ?? []),
    [analytics?.revenueOverTime],
  );

  const statusSlices = useMemo(
    () => orderStatusSlices(analytics?.statusDistribution),
    [analytics?.statusDistribution],
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
    ],
    [trend],
  );

  const users = usersData?.data ?? [];
  const userTotal = usersData?.total ?? 0;
  const userTotalPages = usersData?.totalPages ?? 1;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      <h1 className="font-display font-bold text-2xl text-ink-pri">Quản trị sàn</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-canvas-surface border border-bdr rounded-tb-card p-5 flex items-center gap-4">
          <span className="size-12 rounded-tb-card bg-accent-amber/10 text-accent-amber grid place-items-center shrink-0">
            <ShoppingBag size={22} className="shrink-0" />
          </span>
          <div>
            <div className="text-ink-muted font-body text-xs mb-0.5">Tổng đơn hàng</div>
            <div className="font-display font-bold text-2xl text-ink-pri">
              {ordersLoading || ordersError ? '—' : (ordersData?.total ?? 0)}
            </div>
          </div>
        </div>

        <div className="bg-canvas-surface border border-bdr rounded-tb-card p-5 flex items-center gap-4">
          <span className="size-12 rounded-tb-card bg-accent-cyan/10 text-accent-cyan grid place-items-center shrink-0">
            <Users size={22} className="shrink-0" />
          </span>
          <div>
            <div className="text-ink-muted font-body text-xs mb-0.5">Tổng người dùng</div>
            <div className="font-display font-bold text-2xl text-ink-pri">
              {usersLoading || usersError ? '—' : userTotal}
            </div>
          </div>
        </div>
      </div>

      {/* Overview charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <ChartFrame
          title="Doanh thu 30 ngày"
          subtitle={
            analytics ? `Tổng ${formatVnd(analytics.summary.totalRevenue)}` : undefined
          }
          height={180}
          isLoading={analyticsLoading}
          isEmpty={trend.labels.length === 0}
          emptyLabel="Chưa có doanh thu trong 30 ngày qua."
        >
          <TrendAreaChart
            labels={trend.labels}
            series={trendSeries}
            ariaLabel="Biểu đồ doanh thu toàn sàn 30 ngày gần nhất"
          />
        </ChartFrame>

        <ChartFrame
          title="Trạng thái đơn toàn sàn"
          // Cùng cửa sổ với chart doanh thu bên cạnh, KHÔNG phải toàn bộ lịch sử —
          // thẻ "Tổng đơn hàng" phía trên là số all-time, hai con số sẽ lệch nhau.
          subtitle="30 ngày gần nhất"
          height={180}
          isLoading={analyticsLoading}
          isEmpty={statusSlices.length === 0}
          emptyLabel="Chưa có đơn hàng nào."
        >
          <div className="flex items-center gap-5 size-full">
            <div className="w-1/2 h-full shrink-0">
              <DoughnutChart
                slices={statusSlices}
                ariaLabel="Biểu đồ phân bố trạng thái đơn hàng toàn sàn trong 30 ngày gần nhất"
                centerValue={String(sliceTotal(statusSlices))}
                centerLabel="đơn"
              />
            </div>
            <ChartLegend slices={statusSlices} showPercent className="flex-1 min-w-0" />
          </div>
        </ChartFrame>
      </div>

      {/* Recent orders table */}
      <section className="space-y-3">
        <h2 className="font-display font-semibold text-base text-ink-pri">Đơn hàng gần đây</h2>
        <div className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bdr">
                {['Mã đơn', 'Người mua', 'Tổng tiền', 'Trạng thái', 'Ngày tạo', 'Hóa đơn'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-body font-semibold text-ink-muted text-xs uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordersLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ink-muted font-body text-sm">
                    Đang tải...
                  </td>
                </tr>
              )}
              {!ordersLoading && ordersError && (
                <TableErrorRow error={ordersError} colSpan={6} onRetry={() => { void refetchOrders(); }} />
              )}
              {!ordersLoading && !ordersError && !ordersData?.data.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ink-muted font-body text-sm">
                    Không có đơn hàng nào.
                  </td>
                </tr>
              )}
              {ordersData?.data.map((order, idx) => (
                <tr
                  key={order.id}
                  className={cn(
                    'transition-colors hover:bg-canvas-elevated',
                    idx < (ordersData.data.length - 1) && 'border-b border-bdr',
                  )}
                >
                  <td className="px-4 py-3 font-mono text-ink-sec text-xs">#{order.id}</td>
                  <td className="px-4 py-3 font-body text-ink-pri text-sm">
                    {userDisplayName(order.buyer)}
                  </td>
                  <td className="px-4 py-3 font-body font-semibold text-accent-amber text-sm">
                    {formatVnd(order.total)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 font-body text-ink-sec text-sm">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <InvoiceDownloadButton orderId={order.id} iconOnly />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Users table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-base text-ink-pri">
            Tất cả người dùng
            {!usersLoading && <span className="ml-2 font-normal text-ink-muted text-sm">({userTotal})</span>}
          </h2>
        </div>
        <div className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bdr">
                {['ID', 'Username', 'Email', 'Vai trò', 'Ngày tạo'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-body font-semibold text-ink-muted text-xs uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usersLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ink-muted font-body text-sm">
                    Đang tải...
                  </td>
                </tr>
              )}
              {!usersLoading && usersError && (
                <TableErrorRow error={usersError} colSpan={5} onRetry={() => { void refetchUsers(); }} />
              )}
              {!usersLoading && !usersError && !users.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ink-muted font-body text-sm">
                    Không có người dùng nào.
                  </td>
                </tr>
              )}
              {users.map((user, idx) => (
                <tr
                  key={user.id}
                  className={cn(
                    'transition-colors hover:bg-canvas-elevated',
                    idx < (users.length - 1) && 'border-b border-bdr',
                  )}
                >
                  <td className="px-4 py-3 font-mono text-ink-sec text-xs">{user.id}</td>
                  <td className="px-4 py-3 font-body text-ink-pri text-sm">{user.username}</td>
                  <td className="px-4 py-3 font-body text-ink-sec text-sm">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-tb-pill font-body font-medium text-xs',
                      user.role.name === 'admin' && 'bg-accent-red/15 text-accent-red',
                      user.role.name === 'shop'  && 'bg-accent-amber/15 text-accent-amber',
                      user.role.name !== 'admin' && user.role.name !== 'shop' && 'bg-canvas-elevated text-ink-sec',
                    )}>
                      {user.role.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-body text-ink-sec text-sm">
                    {user.createdAt ? formatDate(user.createdAt) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!usersLoading && userTotalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-bdr">
              <span className="font-body text-xs text-ink-muted">
                Trang {usersPage} / {userTotalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                  disabled={usersPage === 1}
                  className="px-3 py-1 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-sec font-body text-xs hover:border-accent-amber/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Trước
                </button>
                <button
                  onClick={() => setUsersPage(p => Math.min(userTotalPages, p + 1))}
                  disabled={usersPage === userTotalPages}
                  className="px-3 py-1 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-sec font-body text-xs hover:border-accent-amber/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Tiếp
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
