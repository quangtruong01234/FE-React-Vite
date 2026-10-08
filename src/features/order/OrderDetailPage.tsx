import { useState, type ReactElement } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Check, Truck, MapPin, Wallet, CreditCard, XCircle, RotateCcw, CalendarClock, ShoppingCart,
} from 'lucide-react';
import { useOrder } from './useOrder';
import { orderLoadError } from './orderDetailError';
import { useCancelOrder } from './useCancelOrder';
import { useReorder } from './useReorder';
import { ReorderResultPanel } from './ReorderResultPanel';
import { InvoiceDownloadButton } from './InvoiceDownloadButton';
import { useOrderPaymentUrl } from './useOrderPaymentUrl';
import { useMyReturnRequests, useRequestReturn } from './useReturnRequests';
import {
  canRequestReturn, hasReturnActivity, findReturnRequestForOrder,
  returnStatusMeta, refundStatusLabel, returnRequestErrorMessage, returnRequestPayload,
} from './returnRequest';
import { useReturnPhotos } from './useReturnPhotos';
import { ReturnPhotoPicker } from './ReturnPhotoPicker';
import { ReturnPhotoStrip } from './ReturnPhotoStrip';
import { useRole } from '@/hooks/auth/useRole';
import { ShippingAddressBlock } from './ShippingAddressBlock';
import { orderPriceBreakdown, orderVoucherLabel } from './orderSummary';
import { isAwaitingPayment } from './orderPayment';
import { expectedDeliveryLabel } from './expectedDelivery';
import { OrderHistoryCard } from './OrderHistoryCard';
import { ApiErrorState } from '@/components/shared/ApiErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ProductThumb } from '@/components/shared/ProductThumb';
import { StarRating } from '@/components/shared/StarRating';
import { Skeleton } from '@/components/ui/skeleton';
import { GradientButton } from '@/components/shared/GradientButton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { paymentUrlErrorMessage } from '@/lib/domain/paymentUrl';
import { cn, formatVnd } from '@/lib/format/utils';
import { formatDateTime } from '@/lib/format/time';
import type { OrderStatus } from '@/types';
import { paymentLabel } from './orderConstants';
import { orderMessages } from './order.i18n';
import { useT } from '@/hooks/ui/useT';
import { useLanguage } from '@/context/useLanguage';
import type { MessageKey } from '@/lib/i18n/messages';
import { useCreateReview } from '@/hooks/data/useProductReviews';
import { reviewErrorMessage, REVIEW_COMMENT_MAX } from '@/features/product/productReview';

/** Statuses where a delivery date is still a forecast rather than a record. */
const ORDER_IN_FLIGHT: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'pending', 'confirmed', 'processing', 'shipped', 'delivering',
]);

function OrderItemReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const createReview = useCreateReview(productId);
  const t = useT(orderMessages);
  const { lang } = useLanguage();

  if (submitted) {
    return <span className="font-body text-xs text-accent-amber">{t('reviewed')}</span>;
  }

  return (
    <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-bdr">
      <StarRating rating={rating} readOnly={false} onChange={setRating} size="sm" />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t('reviewPlaceholder')}
        maxLength={REVIEW_COMMENT_MAX}
        rows={2}
        className="w-full resize-none rounded-tb-input border border-bdr bg-canvas-base text-ink-pri font-body text-xs px-3 py-2 placeholder:text-ink-muted focus:outline-none focus:border-accent-amber transition-colors"
      />
      {createReview.error && (
        <p className="m-0 font-body text-xs text-accent-red">
          {reviewErrorMessage(createReview.error, lang)}
        </p>
      )}
      <div>
        <button
          type="button"
          disabled={createReview.isPending}
          onClick={() => createReview.mutate(
            { rating, comment: comment.trim() || null },
            { onSuccess: () => setSubmitted(true) },
          )}
          className="px-4 py-1.5 rounded-tb-cta bg-accent-amber text-canvas-base font-body font-semibold text-xs transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed hover:opacity-90"
        >
          {createReview.isPending ? t('sending') : t('submitReview')}
        </button>
      </div>
    </div>
  );
}

const TIMELINE: { status: OrderStatus; labelKey: MessageKey<typeof orderMessages> }[] = [
  { status: 'pending',    labelKey: 'tlPending' },
  { status: 'confirmed',  labelKey: 'tlConfirmed' },
  { status: 'processing', labelKey: 'tlProcessing' },
  { status: 'shipped',    labelKey: 'tlShipped' },
  { status: 'delivering', labelKey: 'tlDelivering' },
  { status: 'completed',  labelKey: 'tlCompleted' },
];


export default function OrderDetailPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useT(orderMessages);
  const { lang } = useLanguage();
  const orderId = id ?? '';

  const { data: order, isLoading, error: orderError, refetch: refetchOrder } = useOrder(orderId);
  const role = useRole();
  const meId = role?.me?.id ?? '';

  const cancelOrder = useCancelOrder(meId);
  // Cancelling cannot be undone — ask first (prod route test F14, 2026-10-08).
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const getPaymentUrl = useOrderPaymentUrl();
  const reorder = useReorder();

  // F2 return/refund — hooks must run before the early returns below.
  const returnEligible = order ? canRequestReturn(order.status) : false;
  const returnActivity = order ? hasReturnActivity(order.status) : false;
  // No per-order request endpoint — find this order's request in the newest-first
  // "mine" list (page 1 covers recent activity; the relevant request is fresh).
  const { data: myReturns } = useMyReturnRequests(1, 50, returnEligible || returnActivity);
  const requestReturn = useRequestReturn(orderId, meId);
  const [returnFormOpen, setReturnFormOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const returnPhotos = useReturnPhotos(meId);

  if (isLoading) {
    return (
      <div className="max-w-[820px] mx-auto">
        <Skeleton className="h-8 w-32 mb-6 bg-canvas-elevated rounded-lg" />
        <Skeleton className="h-10 w-64 mb-2 bg-canvas-elevated rounded" />
        <Skeleton className="h-4 w-40 mb-6 bg-canvas-elevated rounded" />
        <Skeleton className="h-28 mb-4 bg-canvas-elevated rounded-xl" />
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <Skeleton className="h-24 bg-canvas-elevated rounded-xl" />
          <Skeleton className="h-24 bg-canvas-elevated rounded-xl" />
        </div>
        <Skeleton className="h-48 bg-canvas-elevated rounded-xl" />
      </div>
    );
  }

  if (!order) {
    // BUG-404-01: only a real 404 means "đơn hàng không tồn tại" — 403 / 5xx /
    // offline get their own panel instead of sending the buyer hunting for an
    // order that is still there.
    const loadError = orderLoadError(orderError);
    if (loadError) {
      return <ApiErrorState error={loadError} onRetry={() => { void refetchOrder(); }} />;
    }
    return (
      <div className="max-w-[820px] mx-auto text-center py-20">
        <p className="font-body text-ink-sec mb-4">{t('orderNotFound')}</p>
        <Link to="/orders" className="text-accent-amber text-sm hover:underline">
          {t('backToList')}
        </Link>
      </div>
    );
  }

  const isCanceled = order.status === 'canceled';
  const curStep = TIMELINE.findIndex((step) => step.status === order.status);
  const canCancel = order.status === 'pending' || order.status === 'confirmed' || order.status === 'processing';
  const canReorder = order.status === 'completed' || order.status === 'canceled';
  // `paidAt` is the authoritative unpaid signal now (ORD-GUARD-01) — the status
  // heuristic only survives as a fallback for responses that predate the field.
  const needsPayment = isAwaitingPayment(order);
  const progressPct = curStep >= 0 ? (curStep / (TIMELINE.length - 1)) * 100 : 0;
  // Only a promise while the parcel is still in flight. After delivery the date
  // is history, and GHN-ETA-01 does not refresh it when GHN reschedules, so a
  // post-delivery order would restate a quote that may never have held.
  const etaLabel = ORDER_IN_FLIGHT.has(order.status)
    ? expectedDeliveryLabel(order.expectedDeliveryTime, lang)
    : null;
  const returnRequest = findReturnRequestForOrder(myReturns?.data ?? [], order.id);
  // A rejected request restores the order to delivering/completed — the buyer may re-request.
  const canSubmitReturn = returnEligible && returnRequest?.status !== 'pending_review';
  const breakdown = orderPriceBreakdown(order);
  const voucherLabel = orderVoucherLabel(order);

  return (
    <div className="max-w-[820px] mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate('/orders')}
        className="inline-flex items-center gap-1.5 mb-4 bg-canvas-elevated border border-bdr rounded-lg px-3 py-2 text-ink-pri text-sm cursor-pointer hover:border-accent-amber transition-colors"
      >
        <ArrowLeft size={16} className="shrink-0" /> {t('ordersNav')}
      </button>

      {/* Heading */}
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="font-display font-black text-3xl text-ink-pri m-0">{t('orderTitle', { id: order.id })}</h1>
          <p className="text-sm text-ink-sec m-0 mt-1">{t('placedAt', { time: formatDateTime(order.createdAt, lang) })}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Timeline / canceled banner */}
      {!isCanceled && !returnActivity ? (
        <div className="bg-canvas-surface border border-bdr rounded-xl p-5 mb-4">
          <div className="flex items-start justify-between relative">
            {TIMELINE.map(({ status: s, labelKey }, i) => {
              const done = curStep >= 0 && i <= curStep;
              return (
                <div key={s} className="flex flex-col items-center gap-2 flex-1 relative z-[1]">
                  <span className={cn(
                    'size-9 rounded-full grid place-items-center border-2',
                    done
                      ? 'bg-tb-gradient border-transparent text-ink-on-accent'
                      : 'bg-canvas-elevated border-bdr text-ink-muted',
                  )}>
                    {done ? <Check size={16} className="shrink-0" /> : <span className="text-xs font-bold">{i + 1}</span>}
                  </span>
                  <span className={cn(
                    'text-[11px] text-center font-medium',
                    done ? 'text-ink-pri' : 'text-ink-muted',
                  )}>
                    {t(labelKey)}
                  </span>
                </div>
              );
            })}
            <div className="absolute top-[18px] left-[10%] right-[10%] h-0.5 bg-bdr z-0">
              <div
                className="h-full bg-tb-gradient-90 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          {(order.ghnOrderCode || etaLabel) && (
            <div className="mt-4 pt-4 border-t border-bdr flex flex-col gap-2 text-sm text-ink-sec">
              {order.ghnOrderCode && (
                <div className="flex items-center gap-2">
                  <Truck size={15} className="shrink-0 text-accent-amber" />
                  {t('ghnWaybillColon')} <span className="font-mono text-ink-pri">{order.ghnOrderCode}</span>
                </div>
              )}
              {etaLabel && (
                <div className="flex items-center gap-2">
                  <CalendarClock size={15} className="shrink-0 text-accent-amber" />
                  <span className="text-ink-pri">{etaLabel}</span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : isCanceled ? (
        <div className="bg-canvas-surface border border-tb-red/30 rounded-xl p-4 mb-4 flex items-center gap-3">
          <XCircle size={20} className="text-accent-red shrink-0" />
          <span className="text-sm text-accent-red">{t('canceledBanner')}</span>
        </div>
      ) : null}

      {/* Return / refund panel */}
      {(returnRequest || returnActivity) && (
        <div className="bg-canvas-surface border border-bdr rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted flex items-center gap-1.5">
              <RotateCcw size={13} className="shrink-0" /> {t('returnPanel')}
            </span>
            {returnRequest && (
              <span className={cn(
                'inline-flex items-center px-2 py-0.5 text-xs font-body font-medium rounded-tb-pill border',
                returnStatusMeta(returnRequest.status, lang).className,
              )}>
                {returnStatusMeta(returnRequest.status, lang).label}
              </span>
            )}
          </div>
          {returnRequest ? (
            <div className="flex flex-col gap-1.5">
              <p className="m-0 text-sm text-ink-pri">{t('reason', { reason: returnRequest.reason })}</p>
              <ReturnPhotoStrip urls={returnRequest.imageUrls} />
              {returnRequest.status === 'rejected' && returnRequest.rejectReason && (
                <p className="m-0 text-sm text-accent-red">
                  {t('sellerRejected', { reason: returnRequest.rejectReason })}
                </p>
              )}
              {refundStatusLabel(returnRequest, lang) && (
                <p className="m-0 text-sm text-accent-green">
                  {refundStatusLabel(returnRequest, lang)}
                  {returnRequest.refundAmount != null && ` · ${formatVnd(returnRequest.refundAmount, lang)}`}
                </p>
              )}
            </div>
          ) : (
            <p className="m-0 text-sm text-ink-sec">
              {order.status === 'refunded'
                ? t('orderRefunded')
                : t('returnAwaiting')}
            </p>
          )}
        </div>
      )}

      {/* Shipping + Payment info */}
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-canvas-surface border border-bdr rounded-xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2 flex items-center gap-1.5">
            <MapPin size={13} className="shrink-0" /> {t('shipTo')}
          </div>
          <ShippingAddressBlock raw={order.shippingAddress} />
        </div>
        <div className="bg-canvas-surface border border-bdr rounded-xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2 flex items-center gap-1.5">
            <Wallet size={13} className="shrink-0" /> {t('payment')}
          </div>
          <div className="text-sm text-ink-pri font-semibold">
            {paymentLabel(order.paymentMethod, lang)}
          </div>
          <div className="text-xs text-ink-sec mt-1">
            {needsPayment
              ? t('unpaid')
              : order.paymentMethod === 'cod'
                ? t('collectOnDelivery')
                : t('paid')}
          </div>
        </div>
      </div>

      <OrderHistoryCard orderId={order.id} />

      {/* Items */}
      <div className="bg-canvas-surface border border-bdr rounded-xl overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-bdr font-display font-bold uppercase text-sm tracking-wide text-ink-sec">
          {t('itemsHeading', { count: order.items.length })}
        </div>
        {order.items.map((item) => {
          // Items are server-enriched with productName/image/skuLabel — no hydration.
          return (
          <div key={item.id} className="px-4 py-3 border-b border-bdr last:border-0 flex flex-col gap-0">
            <div className="flex items-center gap-3">
              <ProductThumb
                src={item.image ?? ''}
                alt={item.productName ?? ''}
                to={`/product/${item.productId}`}
                className="w-14 h-14 rounded-tb-input"
              />
              <div className="min-w-0 flex-1">
                <Link
                  to={`/product/${item.productId}`}
                  className="text-sm font-medium text-ink-pri truncate block hover:text-accent-amber transition-colors"
                >
                  {item.productName ?? t('productFallback', { id: String(item.productId) })}
                </Link>
                {item.skuLabel && <div className="text-xs text-ink-sec truncate">{item.skuLabel}</div>}
                <div className="text-xs text-ink-muted font-mono">{t('qty', { count: item.quantity })}</div>
              </div>
              <span className="font-mono font-bold text-sm text-ink-pri whitespace-nowrap">
                {formatVnd(item.price * item.quantity, lang)}
              </span>
            </div>
            {order.status === 'completed' && item.productId && (
              <OrderItemReviewForm productId={item.productId} />
            )}
          </div>
          );
        })}
        <div className="px-4 py-3 flex flex-col gap-2 bg-tb-elevated/40 border-t border-bdr">
          <div className="flex justify-between items-center text-sm text-ink-sec">
            <span>{t('subtotal')}</span>
            <span className="font-mono">{formatVnd(breakdown.subtotal, lang)}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-ink-sec">
            <span>{t('shippingFee')}</span>
            {breakdown.shippingFee === 0 ? (
              <span className="text-accent-green font-medium">{t('free')}</span>
            ) : (
              <span className="font-mono">{formatVnd(breakdown.shippingFee, lang)}</span>
            )}
          </div>
          {breakdown.discount > 0 && (
            <div className="flex justify-between items-center text-sm text-ink-sec">
              <span>
                {t('discount')}
                {voucherLabel && (
                  <span className="font-mono text-xs text-accent-amber"> ({voucherLabel})</span>
                )}
              </span>
              <span className="font-mono text-accent-green">
                −{formatVnd(breakdown.discount, lang)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-bdr">
            <span className="font-semibold text-ink-pri">{t('total')}</span>
            <span className="font-mono font-black text-xl text-accent-amber">
              {formatVnd(breakdown.total, lang)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {needsPayment && (
          <GradientButton
            onClick={() => getPaymentUrl.mutate(order.id)}
            disabled={getPaymentUrl.isPending}
          >
            <CreditCard size={16} className="shrink-0" />
            {getPaymentUrl.isPending ? t('processing') : t('payNow')}
          </GradientButton>
        )}
        <InvoiceDownloadButton orderId={order.id} />
        {canCancel && (
          <button
            onClick={() => setCancelConfirmOpen(true)}
            disabled={cancelOrder.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-tb-input border border-tb-red/30 bg-tb-red/5 text-accent-red font-semibold text-sm cursor-pointer hover:bg-tb-red/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <XCircle size={15} className="shrink-0" />
            {cancelOrder.isPending ? t('canceling') : t('cancelOrder')}
          </button>
        )}
        {canReorder && (
          <button
            onClick={() =>
              reorder.mutate(order.items, {
                onSuccess: (result) => {
                  // Everything re-added: straight to the cart. Otherwise the
                  // panel below says which lines stayed behind and why.
                  if (result.skipped.length === 0 && result.cartLineIds.length > 0) {
                    navigate('/cart', { state: { selectedIds: result.cartLineIds } });
                  }
                },
              })
            }
            disabled={reorder.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-tb-input border border-tb-amber/30 bg-tb-amber/5 text-accent-amber font-semibold text-sm cursor-pointer hover:bg-tb-amber/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <ShoppingCart size={15} className="shrink-0" />
            {reorder.isPending ? t('reordering') : t('reorder')}
          </button>
        )}
        {canSubmitReturn && !returnFormOpen && (
          <button
            onClick={() => setReturnFormOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-tb-input border border-tb-amber/30 bg-tb-amber/5 text-accent-amber font-semibold text-sm cursor-pointer hover:bg-tb-amber/10 transition-colors"
          >
            <RotateCcw size={15} className="shrink-0" />
            {t('requestReturn')}
          </button>
        )}
      </div>

      {reorder.isError && (
        <p role="alert" className="mt-4 mb-0 font-body text-sm text-accent-red">{t('reorderFailed')}</p>
      )}
      {reorder.data && reorder.data.skipped.length > 0 && (
        <ReorderResultPanel
          result={reorder.data}
          onGoToCart={() => navigate('/cart', { state: { selectedIds: reorder.data?.cartLineIds } })}
        />
      )}

      {/* Return request form */}
      {canSubmitReturn && returnFormOpen && (
        <div className="mt-4 bg-canvas-surface border border-bdr rounded-xl p-4 flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted flex items-center gap-1.5">
            <RotateCcw size={13} className="shrink-0" /> {t('returnFormTitle')}
          </span>
          <textarea
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            placeholder={t('returnReasonPlaceholder')}
            maxLength={1000}
            rows={3}
            className="w-full resize-none rounded-tb-input border border-bdr bg-canvas-base text-ink-pri font-body text-sm px-3 py-2 placeholder:text-ink-muted focus:outline-none focus:border-accent-amber transition-colors"
          />
          <ReturnPhotoPicker state={returnPhotos} disabled={requestReturn.isPending} />
          {requestReturn.isError && (
            <p className="m-0 font-body text-sm text-accent-red">
              {returnRequestErrorMessage(requestReturn.error, lang)}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              disabled={requestReturn.isPending || returnPhotos.uploading || !returnReason.trim()}
              onClick={() => requestReturn.mutate(
                returnRequestPayload(returnReason, returnPhotos.photos.map((photo) => photo.url)),
                {
                  onSuccess: () => {
                    setReturnFormOpen(false);
                    setReturnReason('');
                    returnPhotos.reset();
                  },
                },
              )}
              className="px-4 py-2 rounded-tb-cta bg-accent-amber text-canvas-base font-body font-semibold text-sm transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed hover:opacity-90"
            >
              {requestReturn.isPending ? t('sending') : t('submitRequest')}
            </button>
            <button
              type="button"
              disabled={requestReturn.isPending}
              onClick={() => { setReturnFormOpen(false); returnPhotos.discard(); }}
              className="px-4 py-2 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-pri font-body font-semibold text-sm cursor-pointer hover:border-accent-amber transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('close')}
            </button>
          </div>
        </div>
      )}
      {getPaymentUrl.isError && (
        <p className="mt-3 mb-0 font-body text-sm text-accent-red">
          {paymentUrlErrorMessage(getPaymentUrl.error, lang)}
        </p>
      )}
      <ConfirmDialog
        open={cancelConfirmOpen}
        tone="danger"
        title={t('cancelConfirmTitle')}
        description={t('cancelConfirmBody')}
        confirmLabel={t('cancelOrder')}
        cancelLabel={t('cancelConfirmKeep')}
        isPending={cancelOrder.isPending}
        error={cancelOrder.isError ? t('cancelFailed') : null}
        onConfirm={() =>
          cancelOrder.mutate(order.id, { onSuccess: () => setCancelConfirmOpen(false) })
        }
        onCancel={() => {
          setCancelConfirmOpen(false);
          cancelOrder.reset();
        }}
      />
    </div>
  );
}
