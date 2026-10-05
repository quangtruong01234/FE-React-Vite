import { useState, type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, MapPin, Package, Truck, User, Wallet } from 'lucide-react';
import { useSellerOrders } from './useSellerOrders';
import { usePageParam } from '@/hooks/ui/usePageParam';
import { useFilterParam } from '@/hooks/ui/useFilterParam';
import { useListSearch, listSearchEmptyText } from '@/hooks/ui/useListSearch';
import { SearchField } from '@/components/shared/SearchField';
import { FetchingOverlay } from '@/components/shared/FetchingOverlay';
import { useConfirmOrder } from './useConfirmOrder';
import { useReadyToShip } from './useReadyToShip';
import { useSellerOrderDetail } from './useSellerOrderDetail';
import { getSellerOrderActionState, type SellerActionKind } from './sellerOrderActions';
import { sellerOrderActionErrorMessage } from './sellerOrderActionError';
import { ShippingAddressBlock } from './ShippingAddressBlock';
import { InvoiceDownloadButton } from './InvoiceDownloadButton';
import { OrderExportPanel } from './OrderExportPanel';
import { paymentLabel } from './orderConstants';
import { orderMessages } from './order.i18n';
import { useT } from '@/hooks/ui/useT';
import { useLanguage } from '@/context/useLanguage';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { IconButton } from '@/components/shared/IconButton';
import { ProductThumb } from '@/components/shared/ProductThumb';
import { Pagination } from '@/components/shared/Pagination';
import type { OrderStatus, SellerOrderListRow, SellerOrderItemDetail } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatPrice } from '@/lib/format/utils';
import { orderStatusLabel } from '@/lib/domain/orderStatus';
import { formatDateTime } from '@/lib/format/time';
import { isDeletedUser, userDisplayName } from '@/lib/format/user';

type FilterKey = 'all' | OrderStatus;

/** No `status` = the "all" tab; the label is rendered per language. */
interface FilterOpt {
  id: FilterKey;
  status?: OrderStatus;
}

const FILTER_STATUSES: OrderStatus[] = [
  'pending', 'confirmed', 'processing', 'shipped', 'delivering',
  'completed', 'return_requested', 'refunded', 'canceled',
];

const FILTER_OPTS: FilterOpt[] = [
  { id: 'all' },
  ...FILTER_STATUSES.map((s) => ({ id: s, status: s })),
];

const FILTER_KEYS: readonly FilterKey[] = FILTER_OPTS.map(o => o.id);

const LIMIT = 10;

function OrderCard({
  order,
  onAction,
  actionPendingKind,
}: {
  order: SellerOrderListRow;
  onAction: (kind: SellerActionKind, id: string) => void;
  actionPendingKind: SellerActionKind | null;
}): ReactElement {
  const [expanded, setExpanded] = useState(false);
  const t = useT(orderMessages);
  const { lang } = useLanguage();
  const { action, blockedReason } = getSellerOrderActionState(order, lang);
  const actionPending = actionPendingKind !== null;
  const buyerLabel = userDisplayName(order.buyer, `#${order.userId}`, lang);
  // The list now ships decorated items (ORDER-SHAPE-01) — image and skuLabel
  // included — so the card renders from `order.items` directly. The detail call
  // still runs on expand for the fields only it carries (address, buyer notes).
  const { data: detail, isLoading: detailLoading } = useSellerOrderDetail(order.id, expanded);
  const items: SellerOrderItemDetail[] =
    detail?.items ?? (Array.isArray(order.items) ? order.items : []);

  return (
    <div
      data-testid={`seller-order-${order.id}`}
      className="bg-canvas-surface border border-bdr rounded-xl overflow-hidden"
    >
      <div className="p-5 grid grid-cols-[72px_1fr_auto_auto] gap-6 items-center">
        {/* Thumbnail */}
        <div className="size-[72px] rounded-xl bg-canvas-elevated flex-none grid place-items-center">
          <Package size={28} className="text-tb-muted shrink-0" />
        </div>

        {/* Meta */}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <span className="font-mono font-bold text-[13px] text-ink-pri">#{order.id}</span>
            <span className="font-body text-xs text-ink-sec">{formatDateTime(order.createdAt, lang)}</span>
            {order.buyer?.username && !isDeletedUser(order.buyer) && (
              <span className="font-body text-xs text-ink-muted">@{order.buyer.username}</span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-body text-sm text-ink-sec">
              {items.length > 0 ? t('itemsCount', { count: items.length }) : t('orderFallback')}
            </span>
            {order.ghnOrderCode && (
              <span className="font-mono text-[11px] text-ink-muted">{t('ghnShort', { code: order.ghnOrderCode })}</span>
            )}
          </div>
        </div>

        {/* Status + Price column */}
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={order.status} />
          <span className="font-mono font-bold text-accent-amber whitespace-nowrap text-sm">
            {formatPrice(order.total, lang)}
          </span>
        </div>

        {/* Action */}
        <div className="flex items-center gap-2 flex-none">
          {/* An unpaid online order is refused by the backend (400) — say why
              instead of offering a button that cannot work. */}
          {action && blockedReason && (
            <span className="max-w-[160px] font-body text-xs text-ink-muted text-right">
              {blockedReason}
            </span>
          )}
          {action && !blockedReason && (
            <button
              type="button"
              disabled={actionPending}
              onClick={() => onAction(action.kind, order.id)}
              className={cn(
                'px-4 py-2 rounded-tb-input font-body font-semibold text-sm text-ink-pri transition-colors whitespace-nowrap',
                actionPending
                  ? 'bg-tb-amber/40 cursor-not-allowed'
                  : 'bg-tb-gradient text-ink-on-accent hover:opacity-90 cursor-pointer',
              )}
            >
              {actionPending ? t('processing') : action.label}
            </button>
          )}
          <IconButton
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? t('hideDetails') : t('showDetails')}
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
              <User size={12} className="shrink-0" /> {t('buyer')}
            </span>
            <span className="font-body text-sm text-ink-pri">{buyerLabel}</span>
            {order.buyer?.email && (
              <span className="font-body text-xs text-ink-sec">{order.buyer.email}</span>
            )}
          </div>

          {/* Payment */}
          <div className="flex flex-col gap-1.5">
            <span className="font-body text-[11px] font-semibold uppercase tracking-wide text-ink-muted inline-flex items-center gap-1.5">
              <Wallet size={12} className="shrink-0" /> {t('payment')}
            </span>
            <span className="font-body text-sm text-ink-pri">
              {paymentLabel(order.paymentMethod, lang)}
            </span>
            {order.codAmount != null && (
              <span className="font-body text-xs text-ink-sec">
                {t('codAmount', { amount: formatPrice(order.codAmount, lang) })}
              </span>
            )}
          </div>

          {/* Shipping address */}
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <span className="font-body text-[11px] font-semibold uppercase tracking-wide text-ink-muted inline-flex items-center gap-1.5">
              <MapPin size={12} className="shrink-0" /> {t('shipTo')}
            </span>
            <ShippingAddressBlock raw={order.shippingAddress} className="font-body" />
          </div>

          {/* GHN tracking */}
          {order.ghnOrderCode && (
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <span className="font-body text-[11px] font-semibold uppercase tracking-wide text-ink-muted inline-flex items-center gap-1.5">
                <Truck size={12} className="shrink-0" /> {t('ghnWaybill')}
              </span>
              <span className="font-mono text-sm text-ink-pri">{order.ghnOrderCode}</span>
            </div>
          )}

          {/* Items */}
          <div className="md:col-span-2 rounded-tb-input border border-bdr overflow-hidden">
            <div className="px-3 py-2 border-b border-bdr font-body text-[11px] font-semibold uppercase tracking-wide text-ink-muted bg-tb-elevated/40">
              {t('itemsHeading', { count: items.length })}
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
                    alt={item.productName ?? t('productFallback', { id: String(item.productId) })}
                    className="size-10 rounded-lg shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-body text-sm text-ink-pri truncate">
                        {item.productName?.trim() || t('productFallback', { id: String(item.productId) })}
                      </span>
                      <span className="font-mono text-xs text-ink-muted shrink-0">×{item.quantity}</span>
                    </div>
                    {item.skuLabel && (
                      <span className="font-body text-xs text-ink-muted">{item.skuLabel}</span>
                    )}
                  </div>
                  <span className="font-mono font-semibold text-sm text-ink-pri whitespace-nowrap">
                    {formatPrice(Number(item.price) * item.quantity, lang)}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Invoice — seller may pull the order's PDF (access widened 2026-07-15) */}
          <div className="md:col-span-2 flex justify-end">
            <InvoiceDownloadButton orderId={order.id} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function SellerOrdersPage(): ReactElement {
  const navigate = useNavigate();
  const t = useT(orderMessages);
  const { lang } = useLanguage();
  const [filterTab, setFilterTab] = useFilterParam<FilterKey>('status', FILTER_KEYS, 'all');
  const [page, setPage] = usePageParam();
  const search = useListSearch(() => { if (page !== 1) setPage(1); });

  const activeStatus = FILTER_OPTS.find(o => o.id === filterTab)?.status;

  // The search is ANDed with the status tab server-side (LIST-SEARCH-01).
  const { data, isLoading, isFetching, error } = useSellerOrders(page, LIMIT, activeStatus, search.term);
  const confirmMutation = useConfirmOrder();
  const shipMutation = useReadyToShip();

  const orders: SellerOrderListRow[] = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  const errorMsg = error
    ? (typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : t('loadFailed'))
    : null;

  // A seller action can now legitimately fail (e.g. ready-to-ship 400 when GHN
  // cannot resolve the shipping address — order stays `confirmed`). Surface the
  // failed order id + a friendly reason instead of silently swallowing it.
  const actionError: { id: string; message: string } | null = shipMutation.isError
    ? { id: shipMutation.variables, message: sellerOrderActionErrorMessage(shipMutation.error, 'ready-to-ship', lang) }
    : confirmMutation.isError
      ? { id: confirmMutation.variables, message: sellerOrderActionErrorMessage(confirmMutation.error, 'confirm', lang) }
      : null;

  // setFilterTab also drops ?page= in the same URL update (useFilterParam).
  const handleTabChange = (key: FilterKey): void => {
    setFilterTab(key);
  };

  const handleAction = (kind: SellerActionKind, id: string): void => {
    if (kind === 'confirm') confirmMutation.mutate(id);
    else if (kind === 'ready-to-ship') shipMutation.mutate(id);
  };

  const pendingKindFor = (id: string): SellerActionKind | null => {
    if (confirmMutation.isPending && confirmMutation.variables === id) return 'confirm';
    if (shipMutation.isPending && shipMutation.variables === id) return 'ready-to-ship';
    return null;
  };

  return (
    <div>
      {/* Back button */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label={t('back')}
          className="bg-canvas-elevated border border-bdr rounded-lg px-3 py-2 text-ink-pri cursor-pointer text-sm hover:border-accent-amber transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={16} className="shrink-0" /> {t('back')}
        </button>
      </div>

      <div>
        {/* Page title */}
        <h1 className="font-display font-black text-4xl leading-[1.05] tracking-[-0.02em] text-ink-pri m-0 mb-1">
          {t('sellerTitle')}
        </h1>
        <p className="font-body text-sm text-ink-sec mt-1 mb-7">
          {t('sellerSub')}{' '}
          <Link to="/sell/returns" className="text-accent-amber hover:underline">
            {t('returnRequests')}
          </Link>
        </p>

        {errorMsg && (
          <div className="bg-tb-red/10 border border-accent-red text-accent-red px-4 py-3 rounded-xl mb-6 text-sm font-body">
            {errorMsg}
          </div>
        )}

        {actionError && (
          <div className="bg-tb-red/10 border border-accent-red text-accent-red px-4 py-3 rounded-xl mb-6 text-sm font-body">
            <span className="font-mono font-bold">#{actionError.id}</span> · {actionError.message}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2.5 overflow-x-auto pb-0.5 mb-4">
          {FILTER_OPTS.map(opt => {
            const active = opt.id === filterTab;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleTabChange(opt.id)}
                className={cn(
                  'flex-none px-[18px] py-2.5 rounded-full text-ink-pri font-body font-semibold text-[13px] cursor-pointer whitespace-nowrap border',
                  active ? 'bg-tb-gradient border-transparent text-ink-on-accent' : 'bg-tb-elevated border-tb-border',
                )}
              >
                {opt.status ? orderStatusLabel(opt.status, lang) : t('filterAll')}
              </button>
            );
          })}
        </div>

        <SearchField
          value={search.input}
          onChange={search.setInput}
          placeholder={t('sellerSearchPlaceholder')}
          label={t('sellerSearchLabel')}
          className="max-w-md mb-6"
        />

        {/* CSV export — carries whichever status tab is active */}
        <OrderExportPanel scope="seller" status={activeStatus} />

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
              {listSearchEmptyText(search, t('nounOrders'), lang)
                ?? (filterTab === 'all' ? t('noOrders') : t('noOrdersInTab'))}
            </p>
          </div>
        )}

        {/* Order list */}
        {!isLoading && orders.length > 0 && (
          <FetchingOverlay fetching={isFetching && !isLoading}>
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
          </FetchingOverlay>
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
