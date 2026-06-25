import { useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, MapPin, Package, Truck, User, Wallet } from 'lucide-react';
import { useSellerOrders } from './useSellerOrders';
import { useConfirmOrder } from './useConfirmOrder';
import { useReadyToShip } from './useReadyToShip';
import { useAdvanceOrder, type AdvanceKind } from './useAdvanceOrder';
import { useSellerOrderDetail } from './useSellerOrderDetail';
import { getSellerOrderAction, type SellerActionKind } from './sellerOrderActions';
import { PAYMENT_LABEL } from './orderConstants';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { IconButton } from '@/components/shared/IconButton';
import { ProductThumb } from '@/components/shared/ProductThumb';
import { Pagination } from '@/components/shared/Pagination';
import type { OrderStatus, OrderWithBuyer, SellerOrderItemDetail } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatPrice } from '@/lib/utils';

const ADVANCE_KINDS: readonly SellerActionKind[] = ['ship', 'deliver', 'complete'];
const isAdvanceKind = (kind: SellerActionKind): kind is AdvanceKind =>
  (ADVANCE_KINDS as readonly string[]).includes(kind);

type FilterKey = 'all' | OrderStatus;

interface FilterOpt {
  id: FilterKey;
  label: string;
  status?: string;
}

const FILTER_OPTS: FilterOpt[] = [
  { id: 'all',        label: 'Tất cả' },
  { id: 'pending',    label: 'Chờ xác nhận',    status: 'pending' },
  { id: 'confirmed',  label: 'Đã xác nhận',     status: 'confirmed' },
  { id: 'processing', label: 'Đang xử lý',      status: 'processing' },
  { id: 'shipped',    label: 'Đang vận chuyển',  status: 'shipped' },
  { id: 'delivering', label: 'Đang giao',        status: 'delivering' },
  { id: 'completed',  label: 'Hoàn thành',       status: 'completed' },
  { id: 'canceled',   label: 'Đã hủy',           status: 'canceled' },
];

const LIMIT = 10;

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

function OrderCard({
  order,
  onAction,
  actionPendingKind,
}: {
  order: OrderWithBuyer;
  onAction: (kind: SellerActionKind, id: number) => void;
  actionPendingKind: SellerActionKind | null;
}): ReactElement {
  const [expanded, setExpanded] = useState(false);
  const action = getSellerOrderAction(order.status);
  const actionPending = actionPendingKind !== null;
  const buyerLabel = order.buyer?.name?.trim() || order.buyer?.username || `#${order.userId}`;
  // Enriched items (image + SKU label + name) load lazily on expand; fall back
  // to the list's bare items (normalized to the same shape) until it resolves.
  const { data: detail, isLoading: detailLoading } = useSellerOrderDetail(order.id, expanded);
  const items: SellerOrderItemDetail[] =
    detail?.items ??
    (Array.isArray(order.items)
      ? order.items.map((i) => ({ ...i, image: null, skuLabel: null }))
      : []);

  return (
    <div className="bg-canvas-surface border border-bdr rounded-xl overflow-hidden">
      <div className="p-5 grid grid-cols-[72px_1fr_auto_auto] gap-6 items-center">
        {/* Thumbnail */}
        <div className="size-[72px] rounded-xl bg-canvas-elevated flex-none grid place-items-center">
          <Package size={28} className="text-tb-muted shrink-0" />
        </div>

        {/* Meta */}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <span className="font-mono font-bold text-[13px] text-white">#{order.id}</span>
            <span className="font-body text-xs text-ink-sec">{formatDate(order.createdAt)}</span>
            {order.buyer?.username && (
              <span className="font-body text-xs text-ink-muted">@{order.buyer.username}</span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-body text-sm text-ink-sec">
              {items.length > 0 ? `${items.length} sản phẩm` : 'Đơn hàng'}
            </span>
            {order.ghnOrderCode && (
              <span className="font-mono text-[11px] text-ink-muted">Mã GHN: {order.ghnOrderCode}</span>
            )}
          </div>
        </div>

        {/* Status + Price column */}
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={order.status} />
          <span className="font-mono font-bold text-accent-amber whitespace-nowrap text-sm">
            {formatPrice(Number(order.total))}
          </span>
        </div>

        {/* Action */}
        <div className="flex items-center gap-2 flex-none">
          {action && (
            <button
              type="button"
              disabled={actionPending}
              onClick={() => onAction(action.kind, order.id)}
              className={cn(
                'px-4 py-2 rounded-tb-input font-body font-semibold text-sm text-white transition-colors whitespace-nowrap',
                actionPending
                  ? 'bg-accent-amber/40 cursor-not-allowed'
                  : 'bg-tb-gradient hover:opacity-90 cursor-pointer',
              )}
            >
              {actionPending ? 'Đang xử lý…' : action.label}
            </button>
          )}
          <IconButton
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Thu gọn chi tiết' : 'Xem chi tiết'}
            className="size-9 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-sec hover:border-accent-amber transition-colors cursor-pointer"
          >
            <ChevronDown size={16} className={cn('shrink-0 transition-transform', expanded && 'rotate-180')} />
          </IconButton>
        </div>
      </div>

      {/* Detail */}
      {expanded && (
        <div className="border-t border-bdr px-5 py-4 grid gap-4 md:grid-cols-2">
          {/* Buyer */}
          <div className="flex flex-col gap-1.5">
            <span className="font-body text-[11px] font-semibold uppercase tracking-wide text-ink-muted inline-flex items-center gap-1.5">
              <User size={12} className="shrink-0" /> Người mua
            </span>
            <span className="font-body text-sm text-white">{buyerLabel}</span>
            {order.buyer?.email && (
              <span className="font-body text-xs text-ink-sec">{order.buyer.email}</span>
            )}
          </div>

          {/* Payment */}
          <div className="flex flex-col gap-1.5">
            <span className="font-body text-[11px] font-semibold uppercase tracking-wide text-ink-muted inline-flex items-center gap-1.5">
              <Wallet size={12} className="shrink-0" /> Thanh toán
            </span>
            <span className="font-body text-sm text-white">
              {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
            </span>
            {order.codAmount != null && (
              <span className="font-body text-xs text-ink-sec">
                Thu hộ COD: {formatPrice(Number(order.codAmount))}
              </span>
            )}
          </div>

          {/* Shipping address */}
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <span className="font-body text-[11px] font-semibold uppercase tracking-wide text-ink-muted inline-flex items-center gap-1.5">
              <MapPin size={12} className="shrink-0" /> Giao đến
            </span>
            <span className="font-body text-sm text-white leading-relaxed">{order.shippingAddress}</span>
          </div>

          {/* GHN tracking */}
          {order.ghnOrderCode && (
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <span className="font-body text-[11px] font-semibold uppercase tracking-wide text-ink-muted inline-flex items-center gap-1.5">
                <Truck size={12} className="shrink-0" /> Mã vận đơn GHN
              </span>
              <span className="font-mono text-sm text-white">{order.ghnOrderCode}</span>
            </div>
          )}

          {/* Items */}
          <div className="md:col-span-2 rounded-tb-input border border-bdr overflow-hidden">
            <div className="px-3 py-2 border-b border-bdr font-body text-[11px] font-semibold uppercase tracking-wide text-ink-muted bg-canvas-elevated/40">
              Sản phẩm ({items.length})
            </div>
            {detailLoading && !detail ? (
              <div className="px-3 py-2.5 flex flex-col gap-2">
                <Skeleton className="h-10 w-full bg-canvas-elevated rounded" />
                <Skeleton className="h-10 w-full bg-canvas-elevated rounded" />
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="px-3 py-2.5 border-b border-bdr last:border-0 flex items-center gap-3">
                  <ProductThumb
                    src={item.image ?? ''}
                    alt={item.productName ?? `Sản phẩm #${item.productId}`}
                    className="size-10 rounded-lg shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-body text-sm text-white truncate">
                        {item.productName?.trim() || `Sản phẩm #${item.productId}`}
                      </span>
                      <span className="font-mono text-xs text-ink-muted shrink-0">×{item.quantity}</span>
                    </div>
                    {item.skuLabel && (
                      <span className="font-body text-xs text-ink-muted">{item.skuLabel}</span>
                    )}
                  </div>
                  <span className="font-mono font-semibold text-sm text-white whitespace-nowrap">
                    {formatPrice(Number(item.price) * item.quantity)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SellerOrdersPage(): ReactElement {
  const navigate = useNavigate();
  const [filterTab, setFilterTab] = useState<FilterKey>('all');
  const [page, setPage] = useState(1);

  const activeStatus = FILTER_OPTS.find(o => o.id === filterTab)?.status;

  const { data, isLoading, error } = useSellerOrders(page, LIMIT, activeStatus);
  const confirmMutation = useConfirmOrder();
  const shipMutation = useReadyToShip();
  const advanceMutation = useAdvanceOrder();

  const orders: OrderWithBuyer[] = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  const errorMsg = error
    ? (typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Lỗi tải đơn hàng')
    : null;

  const handleTabChange = (key: FilterKey): void => {
    setFilterTab(key);
    setPage(1);
  };

  const handleAction = (kind: SellerActionKind, id: number): void => {
    if (kind === 'confirm') confirmMutation.mutate(id);
    else if (kind === 'ready-to-ship') shipMutation.mutate(id);
    else if (isAdvanceKind(kind)) advanceMutation.mutate({ id, kind });
  };

  const pendingKindFor = (id: number): SellerActionKind | null => {
    if (confirmMutation.isPending && confirmMutation.variables === id) return 'confirm';
    if (shipMutation.isPending && shipMutation.variables === id) return 'ready-to-ship';
    if (advanceMutation.isPending && advanceMutation.variables?.id === id) return advanceMutation.variables.kind;
    return null;
  };

  return (
    <div>
      {/* Back button */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Quay lại"
          className="bg-canvas-elevated border border-bdr rounded-lg px-3 py-2 text-ink-pri cursor-pointer text-sm hover:border-accent-amber transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={16} className="shrink-0" /> Quay lại
        </button>
      </div>

      <div>
        {/* Page title */}
        <h1 className="font-display font-black text-[36px] leading-[1.05] tracking-[-0.02em] text-white m-0 mb-1">
          Đơn hàng cần xử lý
        </h1>
        <p className="font-body text-sm text-ink-sec mt-1 mb-7">
          Quản lý và xử lý đơn hàng từ người mua
        </p>

        {errorMsg && (
          <div className="bg-red-950/30 border border-accent-red text-accent-red px-4 py-3 rounded-xl mb-6 text-sm font-body">
            {errorMsg}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-[10px] overflow-x-auto pb-[2px] mb-6">
          {FILTER_OPTS.map(opt => {
            const active = opt.id === filterTab;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleTabChange(opt.id)}
                className={cn(
                  'flex-none px-[18px] py-[10px] rounded-full text-white font-body font-semibold text-[13px] cursor-pointer whitespace-nowrap border',
                  active ? 'bg-tb-gradient border-transparent' : 'bg-tb-elevated border-tb-border',
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Skeleton */}
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-canvas-surface border border-bdr rounded-xl p-5 grid grid-cols-[72px_1fr_auto_auto] gap-6 items-center">
                <Skeleton className="size-[72px] rounded-xl bg-canvas-elevated flex-shrink-0" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-24 bg-canvas-elevated rounded" />
                  <Skeleton className="h-3 w-40 bg-canvas-elevated rounded" />
                </div>
                <Skeleton className="h-5 w-20 bg-canvas-elevated rounded-full" />
                <Skeleton className="h-9 w-24 bg-canvas-elevated rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !errorMsg && orders.length === 0 && (
          <div className="bg-canvas-surface border border-bdr rounded-xl py-[60px] px-6 text-center">
            <p className="font-body text-sm text-ink-sec m-0">
              {filterTab === 'all' ? 'Bạn chưa có đơn hàng nào' : 'Không có đơn hàng nào trong mục này'}
            </p>
          </div>
        )}

        {/* Order list */}
        {!isLoading && orders.length > 0 && (
          <div className="flex flex-col gap-3">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onAction={handleAction}
                actionPendingKind={pendingKindFor(order.id)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            className="mt-8"
          />
        )}
      </div>
    </div>
  );
}
