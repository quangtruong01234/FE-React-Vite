import { useState, type ReactElement } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Package, Search } from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';
import { useOrdersByUser } from './useOrdersByUser';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { Order } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatPrice } from '@/lib/utils';

type OrderFilterKey = 'all' | 'pending' | 'completed' | 'canceled';
const FILTER_OPTS: { id: OrderFilterKey; label: string }[] = [
  { id: 'all',       label: 'Tất cả' },
  { id: 'pending',   label: 'Đang xử lý' },
  { id: 'completed', label: 'Hoàn thành' },
  { id: 'canceled',  label: 'Đã hủy' },
];

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export default function OrderHistoryPage(): ReactElement {
  const navigate = useNavigate();
  const { currentUser } = useAuthContext();
  if (!currentUser) return <></>;
  const userId = currentUser.id;

  const [filterTab, setFilterTab] = useState<OrderFilterKey>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading: loading, error } = useOrdersByUser(userId);

  const orders: Order[] = data?.data ?? [];
  const errorMsg = error
    ? (typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Lỗi tải đơn hàng')
    : null;

  const counts: Record<OrderFilterKey, number> = {
    all:       orders.length,
    pending:   orders.filter(o => o.status === 'pending').length,
    completed: orders.filter(o => o.status === 'completed').length,
    canceled:  orders.filter(o => o.status === 'canceled').length,
  };

  const filteredOrders = (() => {
    const byTab = filterTab === 'all' ? orders : orders.filter(o => o.status === filterTab);
    if (!search.trim()) return byTab;
    return byTab.filter(o => String(o.id).includes(search.trim()));
  })();

  return (
    <div className="min-h-screen bg-canvas-base">
      {/* Nav bar */}
      <div className="bg-canvas-surface border-b border-bdr px-5 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
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
          Theo dõi trạng thái và lịch sử đơn hàng của bạn
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
            {filteredOrders.map((order) => (
              <Link
                key={order.id}
                to={`/order/${order.id}`}
                className="bg-canvas-surface border border-bdr rounded-xl overflow-hidden hover:border-amber-400/30 hover:bg-canvas-elevated/40 transition-colors block"
              >
                <div className="p-5 grid grid-cols-[72px_1fr_auto_auto] gap-6 items-center">
                  {/* Thumbnail */}
                  <div className="w-[72px] h-[72px] rounded-xl bg-canvas-elevated flex items-center justify-center flex-shrink-0">
                    <Package size={28} className="text-tb-muted" />
                  </div>

                  {/* Title + meta */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="font-mono font-bold text-[13px] text-white">#{order.id}</span>
                      <span className="font-body text-xs text-ink-sec">{formatDate(order.created_at)}</span>
                    </div>
                    <div className="font-body text-sm text-ink-sec truncate">
                      {Array.isArray(order.items) && order.items.length > 0
                        ? `${order.items.length} sản phẩm`
                        : 'Đơn hàng'}
                    </div>
                  </div>

                  {/* Status */}
                  <StatusBadge status={order.status} />

                  {/* Price */}
                  <div className="font-mono font-bold text-accent-amber whitespace-nowrap text-right">
                    {formatPrice(Number(order.total))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
