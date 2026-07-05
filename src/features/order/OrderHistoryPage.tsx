import { useState, type ReactElement } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';
import { useOrdersByUser } from './useOrdersByUser';
import { useOrderStatusCounts } from './useOrderStatusCounts';
import { orderItemsSummary, orderCoverImage } from './orderSummary';
import { orderFilterCounts, type OrderFilterKey } from './orderFilterCounts';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ProductThumb } from '@/components/shared/ProductThumb';
import type { Order } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatVnd } from '@/lib/format/utils';
import { isActiveStatus, isReturnStatus } from '@/lib/domain/orderStatus';
import { formatDateTime } from '@/lib/format/time';

const FILTER_OPTS: { id: OrderFilterKey; label: string }[] = [
  { id: 'all',       label: 'Tất cả' },
  { id: 'pending',   label: 'Đang xử lý' },
  { id: 'completed', label: 'Hoàn thành' },
  { id: 'return',    label: 'Trả hàng/Hoàn tiền' },
  { id: 'canceled',  label: 'Đã hủy' },
];

export default function OrderHistoryPage(): ReactElement {
  const navigate = useNavigate();
  const { currentUser } = useAuthContext();
  // Hooks must run unconditionally — derive a safe id and gate the render below.
  // `useOrdersByUser` no-ops while `userId <= 0` (its `enabled` guard).
  const userId = currentUser?.id ?? 0;

  const [filterTab, setFilterTab] = useState<OrderFilterKey>('all');
  const [search, setSearch] = useState('');

  const {
    data,
    isLoading: loading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useOrdersByUser(userId);

  const orders: Order[] = data?.pages.flatMap((p) => p.data) ?? [];

  // Order items are server-enriched (productName/image/skuLabel) — no client hydration.
  // Filter badges use full-history server counts, not just the loaded pages.
  const { data: statusCounts } = useOrderStatusCounts(userId);

  const errorMsg = error
    ? (typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Lỗi tải đơn hàng')
    : null;

  const counts = orderFilterCounts(statusCounts);

  const filteredOrders = (() => {
    const byTab =
      filterTab === 'all'
        ? orders
        : filterTab === 'pending'
          ? orders.filter(o => isActiveStatus(o.status))
          : filterTab === 'return'
            ? orders.filter(o => isReturnStatus(o.status))
            : orders.filter(o => o.status === filterTab);
    if (!search.trim()) return byTab;
    return byTab.filter(o => String(o.id).includes(search.trim()));
  })();

  if (!currentUser) return <></>;

  return (
    <div className="min-h-screen bg-canvas-base">
      {/* Nav bar */}
      <div className="bg-canvas-surface border-b border-bdr px-5 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Quay lại"
          className="bg-canvas-elevated border border-bdr rounded-lg px-3 py-2 text-ink-pri cursor-pointer text-sm hover:border-accent-amber transition-colors inline-flex items-center gap-1.5">
          <ArrowLeft size={16} /> Quay lại
        </button>
      </div>

      <div className="max-w-[900px] mx-auto px-8 pt-8 pb-10">
        {/* Page title */}
        <h1 className="font-display font-black text-[36px] leading-[1.05] tracking-[-0.02em] text-white m-0 mb-1">
          Đơn hàng của tôi
        </h1>
        <p className="font-body text-sm text-ink-sec mt-0 mb-7">
          Theo dõi trạng thái và lịch sử đơn hàng của bạn ·{' '}
          <Link to="/returns" className="text-accent-amber hover:underline">
            Yêu cầu trả hàng
          </Link>
        </p>

        {errorMsg && (
          <div className="bg-red-950/30 border border-accent-red text-accent-red px-4 py-3 rounded-xl mb-6 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Filter tabs + search */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex gap-[10px] overflow-x-auto pb-[2px]">
            {FILTER_OPTS.map(opt => {
              const active = opt.id === filterTab;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFilterTab(opt.id)}
                  className={cn(
                    'flex-none px-[18px] py-[10px] rounded-full text-white font-body font-semibold text-[13px] cursor-pointer whitespace-nowrap border',
                    active ? 'bg-tb-gradient border-transparent' : 'bg-tb-elevated border-tb-border',
                  )}
                >
                  {opt.label} ({counts[opt.id]})
                </button>
              );
            })}
          </div>
          <div className="relative w-[280px] shrink-0">
            <Search size={16} className="absolute left-[14px] top-1/2 -translate-y-1/2 text-tb-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-tb-elevated border border-tb-border rounded-[10px] py-[10px] pl-[40px] pr-[14px] text-white font-body text-[13px] placeholder:text-tb-muted outline-none focus:border-amber-400/50 transition-colors"
            />
          </div>
        </div>

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
        {!loading && !errorMsg && filteredOrders.length === 0 && (
          <div className="bg-canvas-surface border border-bdr rounded-xl py-[60px] px-6 text-center">
            <p className="font-body text-sm text-ink-sec m-0">
              {filterTab === 'all' ? 'Bạn chưa có đơn hàng nào' : 'Không có đơn hàng nào trong mục này'}
            </p>
            {filterTab === 'all' && (
              <button
                onClick={() => navigate('/')}
                className="mt-4 px-4 py-2 rounded-lg border border-bdr text-ink-pri text-sm hover:border-accent-amber transition-colors cursor-pointer">
                Khám phá sản phẩm
              </button>
            )}
          </div>
        )}

        {/* Order list */}
        {!loading && filteredOrders.length > 0 && (
          <div className="flex flex-col gap-3">
            {filteredOrders.map((order) => {
              const cover = orderCoverImage(order.items);
              const summary = orderItemsSummary(order.items);
              return (
              <Link
                key={order.id}
                to={`/order/${order.id}`}
                className="bg-canvas-surface border border-bdr rounded-xl overflow-hidden hover:border-amber-400/30 hover:bg-canvas-elevated/40 transition-colors block"
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
                      <span className="font-mono font-bold text-[13px] text-white">#{order.id}</span>
                      <span className="font-body text-xs text-ink-sec">{formatDateTime(order.createdAt)}</span>
                    </div>
                    <div className="font-body text-sm text-ink-sec truncate">
                      {summary}
                    </div>
                  </div>

                  {/* Status */}
                  <StatusBadge status={order.status} />

                  {/* Price */}
                  <div className="font-mono font-bold text-accent-amber whitespace-nowrap text-right">
                    {formatVnd(Number(order.total))}
                  </div>
                </div>
              </Link>
              );
            })}

            {/* Load more — server-paginated history */}
            {hasNextPage && !search.trim() && filterTab === 'all' && (
              <button
                type="button"
                onClick={() => { void fetchNextPage(); }}
                disabled={isFetchingNextPage}
                className="mt-1 self-center px-5 py-2.5 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-pri font-body font-semibold text-sm cursor-pointer hover:border-accent-amber transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isFetchingNextPage ? 'Đang tải…' : 'Tải thêm đơn hàng'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
