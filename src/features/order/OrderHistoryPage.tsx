import { useMemo, useState, type ReactElement } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuthContext } from '@/context/useAuthContext';
import { useOrdersByUser } from './useOrdersByUser';
import { useOrderStatusCounts } from './useOrderStatusCounts';
import { orderItemsSummary, orderCoverImage } from './orderSummary';
import { orderFilterCounts, filterTabStatuses, type OrderFilterKey } from './orderFilterCounts';
import { useDebouncedValue } from '@/hooks/ui/useDebouncedValue';
import { ORDER_SEARCH_MAX } from '@/api/orders';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SearchField } from '@/components/shared/SearchField';
import { ProductThumb } from '@/components/shared/ProductThumb';
import type { Order } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartFrame } from '@/components/shared/charts/ChartFrame';
import { ChartLegend } from '@/components/shared/charts/ChartLegend';
import { DoughnutChart } from '@/components/shared/charts/DoughnutChart';
import { orderStatusSlices, sliceTotal } from '@/lib/chart/chartSeries';
import { cn, formatVnd } from '@/lib/format/utils';
import { formatDateTime } from '@/lib/format/time';
import type { MessageKey } from '@/lib/i18n/messages';
import { useT } from '@/hooks/ui/useT';
import { useLanguage } from '@/context/useLanguage';
import { orderMessages } from './order.i18n';

const FILTER_OPTS: { id: OrderFilterKey; labelKey: MessageKey<typeof orderMessages> }[] = [
  { id: 'all',       labelKey: 'filterAll' },
  { id: 'pending',   labelKey: 'filterInProgress' },
  { id: 'completed', labelKey: 'filterCompleted' },
  { id: 'return',    labelKey: 'filterReturn' },
  { id: 'canceled',  labelKey: 'filterCanceled' },
];

export default function OrderHistoryPage(): ReactElement {
  const navigate = useNavigate();
  const { currentUser } = useAuthContext();
  const t = useT(orderMessages);
  const { lang } = useLanguage();
  // Hooks must run unconditionally — derive a safe id and gate the render below.
  // `useOrdersByUser` no-ops while `userId <= 0` (its `enabled` guard).
  const userId = currentUser?.id ?? '';

  const [filterTab, setFilterTab] = useState<OrderFilterKey>('all');
  const [search, setSearch] = useState('');

  // Both the tab and the order-code search are server-side filters now — one
  // request per page of the narrowed set, instead of pulling the whole history
  // to filter it client-side. Debounced so typing is one request, not one per key.
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const {
    data,
    isLoading: loading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useOrdersByUser(userId, filterTabStatuses(filterTab), debouncedSearch);

  const orders: Order[] = data?.pages.flatMap((p) => p.data) ?? [];

  // Order items are server-enriched (productName/image/skuLabel) — no client hydration.
  // Filter badges use full-history server counts, not just the loaded pages.
  const { data: statusCounts } = useOrderStatusCounts(userId);

  const errorMsg = error
    ? (typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : t('loadFailed'))
    : null;

  const counts = orderFilterCounts(statusCounts);

  // Built from the server-side counts, so the ring covers the WHOLE history —
  // not just the pages the infinite list has loaded, and not just the active tab.
  const statusSlices = useMemo(() => orderStatusSlices(statusCounts, lang), [statusCounts, lang]);

  // The search box lags the typed value by the debounce — say so instead of
  // flashing "no orders" against the previous term's result set.
  const searchPending = search.trim() !== debouncedSearch;

  if (!currentUser) return <></>;

  return (
    <div className="min-h-screen bg-canvas-base">
      {/* Nav bar */}
      <div className="bg-canvas-surface border-b border-bdr px-5 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label={t('back')}
          className="bg-canvas-elevated border border-bdr rounded-lg px-3 py-2 text-ink-pri cursor-pointer text-sm hover:border-accent-amber transition-colors inline-flex items-center gap-1.5">
          <ArrowLeft size={16} className="shrink-0" /> {t('back')}
        </button>
      </div>

      <div className="max-w-[900px] mx-auto px-8 pt-8 pb-10">
        {/* Page title */}
        <h1 className="font-display font-black text-4xl leading-[1.05] tracking-[-0.02em] text-ink-pri m-0 mb-1">
          {t('myOrders')}
        </h1>
        <p className="font-body text-sm text-ink-sec mt-0 mb-7">
          {t('myOrdersSub')}{' '}
          <Link to="/returns" className="text-accent-amber hover:underline">
            {t('returnRequests')}
          </Link>
        </p>

        {errorMsg && (
          <div className="bg-tb-red/10 border border-accent-red text-accent-red px-4 py-3 rounded-xl mb-6 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Filter tabs + search */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex gap-2.5 overflow-x-auto pb-0.5">
            {FILTER_OPTS.map(opt => {
              const active = opt.id === filterTab;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFilterTab(opt.id)}
                  className={cn(
                    'flex-none px-[18px] py-2.5 rounded-full text-ink-pri font-body font-semibold text-[13px] cursor-pointer whitespace-nowrap border',
                    active ? 'bg-tb-gradient border-transparent text-ink-on-accent' : 'bg-tb-elevated border-tb-border',
                  )}
                >
                  {t(opt.labelKey)} ({counts[opt.id]})
                </button>
              );
            })}
          </div>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder={t('searchOrderId')}
            // The backend answers 400 past 32 chars — cap the box, not the request.
            maxLength={ORDER_SEARCH_MAX}
            className="w-[280px] shrink-0"
          />
        </div>

        {/* Status overview — whole history, independent of the active tab */}
        {statusSlices.length > 0 && (
          <ChartFrame
            title={t('overview')}
            subtitle={t('overviewSub')}
            height={160}
            className="mb-6"
          >
            <div className="flex items-center gap-6 size-full">
              <div className="w-[45%] h-full shrink-0">
                <DoughnutChart
                  slices={statusSlices}
                  ariaLabel={t('overviewAria')}
                  centerValue={String(sliceTotal(statusSlices))}
                  centerLabel={t('ordersUnit')}
                  valueFormatter={(v) => t('ordersCount', { count: v })}
                />
              </div>
              <ChartLegend slices={statusSlices} showPercent className="flex-1 min-w-0" />
            </div>
          </ChartFrame>
        )}

        {/* Skeleton */}
        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-canvas-surface border border-bdr rounded-xl p-5 grid grid-cols-[72px_1fr_auto_auto_auto] gap-6 items-center">
                <Skeleton className="w-[72px] h-[72px] rounded-xl bg-canvas-elevated flex-shrink-0" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-24 bg-canvas-elevated rounded" />
                  <Skeleton className="h-3 w-40 bg-canvas-elevated rounded" />
                </div>
                <Skeleton className="h-5 w-20 bg-canvas-elevated rounded-full" />
                <Skeleton className="h-5 w-28 bg-canvas-elevated rounded" />
                <Skeleton className="w-9 h-9 bg-canvas-elevated rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !errorMsg && orders.length === 0 && (
          <div className="bg-canvas-surface border border-bdr rounded-xl py-[60px] px-6 text-center">
            <p className="font-body text-sm text-ink-sec m-0">
              {searchPending
                ? t('searching')
                : debouncedSearch
                  ? t('noOrderMatch', { term: debouncedSearch })
                  : filterTab === 'all'
                    ? t('noOrders')
                    : t('noOrdersInTab')}
            </p>
            {filterTab === 'all' && !debouncedSearch && !searchPending && (
              <button
                onClick={() => navigate('/')}
                className="mt-4 px-4 py-2 rounded-lg border border-bdr text-ink-pri text-sm hover:border-accent-amber transition-colors cursor-pointer">
                {t('explore')}
              </button>
            )}
          </div>
        )}

        {/* Order list */}
        {!loading && orders.length > 0 && (
          <div className="flex flex-col gap-3">
            {orders.map((order) => {
              const cover = orderCoverImage(order.items);
              const summary = orderItemsSummary(order.items, lang);
              return (
              <Link
                key={order.id}
                to={`/order/${order.id}`}
                className="bg-canvas-surface border border-bdr rounded-xl overflow-hidden hover:border-tb-amber/30 hover:bg-tb-elevated/40 transition-colors block"
              >
                <div className="p-5 grid grid-cols-[72px_1fr_auto_auto] gap-6 items-center">
                  {/* Thumbnail */}
                  <ProductThumb
                    src={cover}
                    alt={order.items[0]?.productName ?? ''}
                    iconSize={28}
                    className="w-[72px] h-[72px] rounded-xl"
                  />

                  {/* Title + meta */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="font-mono font-bold text-[13px] text-ink-pri">#{order.id}</span>
                      <span className="font-body text-xs text-ink-sec">{formatDateTime(order.createdAt, lang)}</span>
                    </div>
                    <div className="font-body text-sm text-ink-sec truncate">
                      {summary}
                    </div>
                  </div>

                  {/* Status */}
                  <StatusBadge status={order.status} />

                  {/* Price */}
                  <div className="font-mono font-bold text-accent-amber whitespace-nowrap text-right">
                    {formatVnd(order.total, lang)}
                  </div>
                </div>
              </Link>
              );
            })}

            {/* `hasNext` describes the searched set too, so the same button paginates it */}
            {hasNextPage && (
              <button
                type="button"
                onClick={() => { void fetchNextPage(); }}
                disabled={isFetchingNextPage}
                className="mt-1 self-center px-5 py-2.5 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-pri font-body font-semibold text-sm cursor-pointer hover:border-accent-amber transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isFetchingNextPage ? t('downloading') : t('loadMore')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
