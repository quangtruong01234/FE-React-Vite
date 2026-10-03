import { type ReactElement, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Users, ShoppingBag } from 'lucide-react';
import { cn, formatPrice, formatVnd } from '@/lib/format/utils';
import { formatDate } from '@/lib/format/time';
import { nonBlank, userDisplayName, userFallback } from '@/lib/format/user';
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
import { revenueTrend } from '@/features/order/analytics/analyticsChartData';
import { SelectField } from '@/components/shared/SelectField';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { SearchField } from '@/components/shared/SearchField';
import { useListSearch, listSearchEmptyText } from '@/hooks/ui/useListSearch';
import { useRole } from '@/hooks/auth/useRole';
import { useUpdateUserRole } from './useUpdateUserRole';
import {
  assignableRoleOptions,
  isAssignableRole,
  roleChangeConfirmBody,
  roleChangeConfirmTitle,
  roleChangeSuccessText,
  roleEditability,
} from './userRole';
import { roleLabel } from '@/lib/auth/roleLabels';
import { useT } from '@/hooks/ui/useT';
import { useLanguage } from '@/context/useLanguage';
import { adminMessages, type AdminMessageKey } from './admin.i18n';
import type { AnalyticsQueryParams, RoleName, User } from '@/types';

const USERS_PER_PAGE = 20;

/**
 * Module-level so the object identity is stable: an inline literal would be a
 * fresh value in the query key on every render. Omitting `from`/`to` lets the
 * backend apply its own last-30-days default — the same window the dedicated
 * `/admin/analytics` page opens on.
 */
const OVERVIEW_RANGE: AnalyticsQueryParams = { interval: 'day' };

const ORDER_COLUMNS: readonly AdminMessageKey[] = [
  'colOrderId',
  'colBuyer',
  'colTotal',
  'colStatus',
  'colCreatedAt',
  'colInvoice',
];
const USER_COLUMNS: readonly AdminMessageKey[] = ['colId', 'colUsername', 'colEmail', 'colRole', 'colCreatedAt'];

export default function AdminPage(): ReactElement {
  const t = useT(adminMessages);
  const { lang } = useLanguage();
  const [usersPage, setUsersPage] = useState(1);
  const userSearch = useListSearch(() => setUsersPage(1));
  const [roleNotice, setRoleNotice] = useState<string | null>(null);
  /** The pick waiting on the confirm modal — set by the select, cleared by both buttons. */
  const [pendingRole, setPendingRole] = useState<{ user: User; nextRole: RoleName } | null>(null);

  // `useRole()` and not `useAuthContext()`: the context value is stale right
  // after an in-app login, and this decides which row is the admin's own.
  const currentUserId = useRole()?.me.id;
  const roleMutation = useUpdateUserRole();

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
    queryKey: queryKeys.users.list(usersPage, USERS_PER_PAGE, userSearch.term),
    queryFn: () => api.users.getPaginated(usersPage, USERS_PER_PAGE, userSearch.term),
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
    () => orderStatusSlices(analytics?.statusDistribution, lang),
    [analytics?.statusDistribution, lang],
  );

  const trendSeries = useMemo<TrendSeries[]>(
    () => [
      {
        id: 'revenue',
        label: t('revenueSeries'),
        color: 'amber',
        values: trend.revenue,
        formatter: (n: number) => formatPrice(n, lang),
      },
    ],
    [trend, t, lang],
  );
  const roleOptions = useMemo(() => assignableRoleOptions(lang), [lang]);

  const users = usersData?.data ?? [];
  const userTotal = usersData?.total ?? 0;
  const userTotalPages = usersData?.totalPages ?? 1;

  const roleError = toApiError(roleMutation.error);

  function handleRoleChange(user: User, nextRole: string): void {
    // A no-op pick is not a request: the endpoint is idempotent, but firing it
    // would still pop a confirm and a "đã đặt" notice for nothing.
    if (!isAssignableRole(nextRole) || nextRole === user.role.name) return;
    setPendingRole({ user, nextRole });
  }

  function confirmRoleChange(): void {
    if (!pendingRole) return;
    const { user, nextRole } = pendingRole;
    const displayName = userDisplayName(user, userFallback(lang));

    setRoleNotice(null);
    roleMutation.mutate(
      { userId: user.id, role: nextRole },
      {
        // Read the role back off the response rather than echoing `nextRole` —
        // the server's answer is what the row now holds.
        onSuccess: (updated) => {
          // Worded in the language active when the change lands.
          setRoleNotice(roleChangeSuccessText(displayName, updated.role.name, lang));
        },
        // Closes on failure too: the refusal is already rendered above the
        // table, and leaving the dialog up would print it twice.
        onSettled: () => { setPendingRole(null); },
      },
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      <h1 className="font-display font-bold text-2xl text-ink-pri">{t('title')}</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-canvas-surface border border-bdr rounded-tb-card p-5 flex items-center gap-4">
          <span className="size-12 rounded-tb-card bg-tb-amber/10 text-accent-amber grid place-items-center shrink-0">
            <ShoppingBag size={22} className="shrink-0" />
          </span>
          <div>
            <div className="text-ink-muted font-body text-xs mb-0.5">{t('statOrders')}</div>
            <div className="font-display font-bold text-2xl text-ink-pri">
              {ordersLoading || ordersError ? '—' : (ordersData?.total ?? 0)}
            </div>
          </div>
        </div>

        <div className="bg-canvas-surface border border-bdr rounded-tb-card p-5 flex items-center gap-4">
          <span className="size-12 rounded-tb-card bg-tb-cyan/10 text-accent-cyan grid place-items-center shrink-0">
            <Users size={22} className="shrink-0" />
          </span>
          <div>
            <div className="text-ink-muted font-body text-xs mb-0.5">{t('statUsers')}</div>
            <div className="font-display font-bold text-2xl text-ink-pri">
              {usersLoading || usersError ? '—' : userTotal}
            </div>
          </div>
        </div>
      </div>

      {/* Overview charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <ChartFrame
          title={t('revenueTitle')}
          subtitle={
            analytics ? t('revenueSubtitle', { total: formatVnd(analytics.summary.totalRevenue, lang) }) : undefined
          }
          height={180}
          isLoading={analyticsLoading}
          isEmpty={trend.labels.length === 0}
          emptyLabel={t('revenueEmpty')}
        >
          <TrendAreaChart
            labels={trend.labels}
            series={trendSeries}
            ariaLabel={t('revenueAria')}
          />
        </ChartFrame>

        <ChartFrame
          title={t('statusTitle')}
          // Cùng cửa sổ với chart doanh thu bên cạnh, KHÔNG phải toàn bộ lịch sử —
          // thẻ "Tổng đơn hàng" phía trên là số all-time, hai con số sẽ lệch nhau.
          subtitle={t('statusSubtitle')}
          height={180}
          isLoading={analyticsLoading}
          isEmpty={statusSlices.length === 0}
          emptyLabel={t('statusEmpty')}
        >
          <div className="flex items-center gap-5 size-full">
            <div className="w-1/2 h-full shrink-0">
              <DoughnutChart
                slices={statusSlices}
                ariaLabel={t('statusAria')}
                centerValue={String(sliceTotal(statusSlices))}
                centerLabel={t('statusCenter')}
              />
            </div>
            <ChartLegend slices={statusSlices} showPercent className="flex-1 min-w-0" />
          </div>
        </ChartFrame>
      </div>

      {/* Recent orders table */}
      <section className="space-y-3">
        <h2 className="font-display font-semibold text-base text-ink-pri">{t('ordersTitle')}</h2>
        <div className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bdr">
                {ORDER_COLUMNS.map(h => (
                  <th key={h} className="text-left px-4 py-3 font-body font-semibold text-ink-muted text-xs uppercase tracking-wide">
                    {t(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordersLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ink-muted font-body text-sm">
                    {t('loading')}
                  </td>
                </tr>
              )}
              {!ordersLoading && ordersError && (
                <TableErrorRow error={ordersError} colSpan={6} onRetry={() => { void refetchOrders(); }} />
              )}
              {!ordersLoading && !ordersError && !ordersData?.data.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ink-muted font-body text-sm">
                    {t('ordersEmpty')}
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
                    {userDisplayName(order.buyer, userFallback(lang))}
                  </td>
                  <td className="px-4 py-3 font-body font-semibold text-accent-amber text-sm">
                    {formatVnd(order.total, lang)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 font-body text-ink-sec text-sm">
                    {formatDate(order.createdAt, lang)}
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
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-display font-semibold text-base text-ink-pri">
            {t('usersTitle')}
            {!usersLoading && <span className="ml-2 font-normal text-ink-muted text-sm">({userTotal})</span>}
          </h2>
          <SearchField
            value={userSearch.input}
            onChange={userSearch.setInput}
            placeholder={t('usersSearchPlaceholder')}
            label={t('usersSearchLabel')}
            className="w-full sm:w-72"
          />
        </div>

        {/* Role-change outcome. The success copy names the re-login requirement:
            the JWT bakes the role at login and nothing revokes it, so the new
            role does nothing until the target signs in again (ROLE-ADMIN-01). */}
        {roleNotice && (
          <p className="bg-tb-cyan/10 border border-tb-cyan/30 rounded-tb-input px-3 py-2 font-body text-xs text-accent-cyan">
            {roleNotice}
          </p>
        )}
        {roleError && (
          <p className="bg-tb-red/10 border border-tb-red/30 rounded-tb-input px-3 py-2 font-body text-xs text-accent-red">
            {roleError.message}
          </p>
        )}

        <div className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bdr">
                {USER_COLUMNS.map(h => (
                  <th key={h} className="text-left px-4 py-3 font-body font-semibold text-ink-muted text-xs uppercase tracking-wide">
                    {t(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usersLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-ink-muted font-body text-sm">
                    {t('loading')}
                  </td>
                </tr>
              )}
              {!usersLoading && usersError && (
                <TableErrorRow error={usersError} colSpan={5} onRetry={() => { void refetchUsers(); }} />
              )}
              {!usersLoading && !usersError && !users.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-ink-muted font-body text-sm">
                    {listSearchEmptyText(userSearch, t('usersSearchNoun'), lang) ?? t('usersEmpty')}
                  </td>
                </tr>
              )}
              {users.map((user, idx) => {
                const editability = roleEditability(
                  { id: user.id, roleName: user.role.name },
                  currentUserId,
                  lang,
                );
                return (
                  <tr
                    key={user.id}
                    className={cn(
                      'transition-colors hover:bg-canvas-elevated',
                      idx < (users.length - 1) && 'border-b border-bdr',
                    )}
                  >
                    <td className="px-4 py-3 font-mono text-ink-sec text-xs">{user.id}</td>
                    {/* Accounts created before NAME-TRIM-01 can hold a whitespace
                        `username` and the backend does not backfill them, so the raw
                        field rendered an empty cell. Deliberately NOT
                        `userDisplayName()`: that prefers the display name, and this
                        column is labelled USERNAME — an admin reads it to identify the
                        account, so substituting `name` would print the wrong field.
                        Em dash matches the `createdAt` cell below; the ID column and
                        the role control's `aria-label` already identify the row. */}
                    <td className="px-4 py-3 font-body text-ink-pri text-sm">
                      {nonBlank(user.username) ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-body text-ink-sec text-sm">{user.email}</td>
                    <td className="px-4 py-3">
                      {editability.canEdit ? (
                        <SelectField
                          size="sm"
                          value={user.role.name}
                          options={roleOptions}
                          // Rows written before NAME-TRIM-01 can carry a
                          // whitespace `username`, which left this control
                          // announced as "Vai trò của " with no subject. The
                          // public id is what the row's first column shows, so
                          // it ties the announcement back to the visible row.
                          ariaLabel={t('roleAria', { name: nonBlank(user.username) ?? user.id })}
                          // Every row locks during the request: the list is
                          // refetched on success, so a second pick mid-flight
                          // would race a row that is about to be replaced.
                          disabled={roleMutation.isPending}
                          onChange={(next) => { handleRoleChange(user, next); }}
                        />
                      ) : (
                        <span
                          title={editability.reason}
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-tb-pill font-body font-medium text-xs',
                            // Tints use the literal-hex tokens: `accent-*` is a `var()`
                            // and Tailwind emits nothing for `/15` on it, so these
                            // pills were rendering with no background at all.
                            user.role.name === 'admin' && 'bg-tb-red/15 text-accent-red',
                            user.role.name === 'shop' && 'bg-tb-amber/15 text-accent-amber',
                            user.role.name !== 'admin' && user.role.name !== 'shop' && 'bg-canvas-elevated text-ink-sec',
                          )}
                        >
                          {roleLabel(user.role.name, lang)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-body text-ink-sec text-sm">
                      {user.createdAt ? formatDate(user.createdAt, lang) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!usersLoading && userTotalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-bdr">
              <span className="font-body text-xs text-ink-muted">
                {t('pageOf', { page: usersPage, total: userTotalPages })}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                  disabled={usersPage === 1}
                  className="px-3 py-1 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-sec font-body text-xs hover:border-tb-amber/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t('prev')}
                </button>
                <button
                  onClick={() => setUsersPage(p => Math.min(userTotalPages, p + 1))}
                  disabled={usersPage === userTotalPages}
                  className="px-3 py-1 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-sec font-body text-xs hover:border-tb-amber/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t('next')}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={pendingRole !== null}
        title={
          pendingRole
            ? roleChangeConfirmTitle(userDisplayName(pendingRole.user, userFallback(lang)), pendingRole.nextRole, lang)
            : ''
        }
        description={roleChangeConfirmBody(lang)}
        confirmLabel={t('roleConfirm')}
        isPending={roleMutation.isPending}
        onConfirm={confirmRoleChange}
        onCancel={() => { setPendingRole(null); }}
      />
    </div>
  );
}
