import { useState, type ReactElement } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Check, Truck, MapPin, Wallet, FileDown, CreditCard, XCircle,
} from 'lucide-react';
import { useOrder } from './useOrder';
import { useCancelOrder } from './useCancelOrder';
import { useOrderInvoice } from './useOrderInvoice';
import { useOrderPaymentUrl } from './useOrderPaymentUrl';
import { useRole } from '@/hooks/useRole';
import { ShippingAddressBlock } from './ShippingAddressBlock';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ProductThumb } from '@/components/shared/ProductThumb';
import { StarRating } from '@/components/shared/StarRating';
import { Skeleton } from '@/components/ui/skeleton';
import { GradientButton } from '@/components/shared/GradientButton';
import { cn, formatVnd } from '@/lib/utils';
import type { ApiError, OrderStatus } from '@/types';
import { PAYMENT_LABEL } from './orderConstants';
import { useCreateReview } from '../product/useProductReviews';

function resolveReviewError(error: unknown): string {
  const err = error as ApiError;
  if (err?.statusCode === 404) return 'Đơn hàng chưa được xác nhận hoàn thành';
  if (err?.statusCode === 409) return 'Bạn đã đánh giá sản phẩm này rồi';
  return err?.message ?? 'Đã xảy ra lỗi';
}

function OrderItemReviewForm({ productId }: { productId: number }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const createReview = useCreateReview(productId);

  if (submitted) {
    return <span className="font-body text-xs text-accent-amber">✓ Đã đánh giá</span>;
  }

  return (
    <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-bdr">
      <StarRating rating={rating} readOnly={false} onChange={setRating} size="sm" />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Nhận xét (không bắt buộc)"
        maxLength={2000}
        rows={2}
        className="w-full resize-none rounded-tb-input border border-bdr bg-canvas-base text-ink-pri font-body text-xs px-3 py-2 placeholder:text-ink-muted focus:outline-none focus:border-accent-amber transition-colors"
      />
      {createReview.error && (
        <p className="m-0 font-body text-xs text-accent-red">
          {resolveReviewError(createReview.error)}
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
          {createReview.isPending ? 'Đang gửi...' : 'Gửi đánh giá'}
        </button>
      </div>
    </div>
  );
}

const TIMELINE: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivering', 'completed'];
const TL_LABEL: Record<string, string> = {
  pending:    'Đã đặt',
  confirmed:  'Đã xác nhận',
  processing: 'Đang chuẩn bị',
  shipped:    'Đã gửi GHN',
  delivering: 'Đang giao',
  completed:  'Hoàn thành',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function OrderDetailPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orderId = Number(id ?? 0);

  const { data: order, isLoading } = useOrder(orderId);
  const role = useRole();
  const meId = role?.me?.id ?? 0;

  const cancelOrder = useCancelOrder(meId);
  const downloadInvoice = useOrderInvoice();
  const getPaymentUrl = useOrderPaymentUrl();

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
    return (
      <div className="max-w-[820px] mx-auto text-center py-20">
        <p className="font-body text-ink-sec mb-4">Không tìm thấy đơn hàng.</p>
        <Link to="/orders" className="text-accent-amber text-sm hover:underline">
          Về danh sách đơn hàng
        </Link>
      </div>
    );
  }

  const isCanceled = order.status === 'canceled';
  const curStep = TIMELINE.indexOf(order.status);
  const canCancel = order.status === 'pending' || order.status === 'confirmed' || order.status === 'processing';
  // Online orders stay unpaid through 'confirmed' — payment completion is what moves them to 'processing'
  const needsPayment = (order.status === 'pending' || order.status === 'confirmed') && order.paymentMethod !== 'cod';
  const progressPct = curStep >= 0 ? (curStep / (TIMELINE.length - 1)) * 100 : 0;

  return (
    <div className="max-w-[820px] mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate('/orders')}
        className="inline-flex items-center gap-1.5 mb-4 bg-canvas-elevated border border-bdr rounded-lg px-3 py-2 text-ink-pri text-sm cursor-pointer hover:border-accent-amber transition-colors"
      >
        <ArrowLeft size={16} /> Đơn hàng
      </button>

      {/* Heading */}
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="font-display font-black text-3xl text-white m-0">Đơn hàng #{order.id}</h1>
          <p className="text-sm text-ink-sec m-0 mt-1">Đặt lúc {formatDate(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Timeline / canceled banner */}
      {!isCanceled ? (
        <div className="bg-canvas-surface border border-bdr rounded-xl p-5 mb-4">
          <div className="flex items-start justify-between relative">
            {TIMELINE.map((s, i) => {
              const done = curStep >= 0 && i <= curStep;
              return (
                <div key={s} className="flex flex-col items-center gap-2 flex-1 relative z-[1]">
                  <span className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center border-2',
                    done
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500 border-transparent text-white'
                      : 'bg-canvas-elevated border-bdr text-ink-muted',
                  )}>
                    {done ? <Check size={16} /> : <span className="text-xs font-bold">{i + 1}</span>}
                  </span>
                  <span className={cn(
                    'text-[11px] text-center font-medium',
                    done ? 'text-white' : 'text-ink-muted',
                  )}>
                    {TL_LABEL[s]}
                  </span>
                </div>
              );
            })}
            <div className="absolute top-[18px] left-[10%] right-[10%] h-0.5 bg-bdr z-0">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          {order.ghnOrderCode && (
            <div className="mt-4 pt-4 border-t border-bdr flex items-center gap-2 text-sm text-ink-sec">
              <Truck size={15} className="text-accent-amber" />
              Mã vận đơn GHN: <span className="font-mono text-white">{order.ghnOrderCode}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-canvas-surface border border-red-500/30 rounded-xl p-4 mb-4 flex items-center gap-3">
          <XCircle size={20} className="text-red-300 shrink-0" />
          <span className="text-sm text-red-200">Đơn hàng đã được hủy.</span>
        </div>
      )}

      {/* Shipping + Payment info */}
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-canvas-surface border border-bdr rounded-xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2 flex items-center gap-1.5">
            <MapPin size={13} /> Giao đến
          </div>
          <ShippingAddressBlock raw={order.shippingAddress} />
        </div>
        <div className="bg-canvas-surface border border-bdr rounded-xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2 flex items-center gap-1.5">
            <Wallet size={13} /> Thanh toán
          </div>
          <div className="text-sm text-white font-semibold">
            {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
          </div>
          <div className="text-xs text-ink-sec mt-1">
            {needsPayment
              ? 'Chưa thanh toán'
              : order.paymentMethod === 'cod'
                ? 'Thu khi nhận hàng'
                : 'Đã thanh toán'}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-canvas-surface border border-bdr rounded-xl overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-bdr font-display font-bold uppercase text-sm tracking-wide text-ink-sec">
          Sản phẩm ({order.items.length})
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
                className="w-14 h-14 rounded-[10px]"
              />
              <div className="min-w-0 flex-1">
                <Link
                  to={`/product/${item.productId}`}
                  className="text-sm font-medium text-white truncate block hover:text-accent-amber transition-colors"
                >
                  {item.productName ?? `Sản phẩm #${item.productId}`}
                </Link>
                {item.skuLabel && <div className="text-xs text-ink-sec truncate">{item.skuLabel}</div>}
                <div className="text-xs text-ink-muted font-mono">SL: {item.quantity}</div>
              </div>
              <span className="font-mono font-bold text-sm text-white whitespace-nowrap">
                {formatVnd(item.price * item.quantity)}
              </span>
            </div>
            {order.status === 'completed' && (
              <OrderItemReviewForm productId={item.productId} />
            )}
          </div>
          );
        })}
        <div className="px-4 py-3 flex justify-between items-center bg-canvas-elevated/40">
          <span className="font-semibold text-white">Tổng cộng</span>
          <span className="font-mono font-black text-xl text-accent-amber">
            {formatVnd(Number(order.total))}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {needsPayment && (
          <GradientButton
            onClick={() => getPaymentUrl.mutate(order.id)}
            disabled={getPaymentUrl.isPending}
          >
            <CreditCard size={16} />
            {getPaymentUrl.isPending ? 'Đang xử lý...' : 'Thanh toán ngay'}
          </GradientButton>
        )}
        <button
          onClick={() => downloadInvoice.mutate(order.id)}
          disabled={downloadInvoice.isPending}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-pri font-semibold text-sm cursor-pointer hover:border-accent-amber transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <FileDown size={15} />
          {downloadInvoice.isPending ? 'Đang tải...' : 'Tải hóa đơn PDF'}
        </button>
        {canCancel && (
          <button
            onClick={() => cancelOrder.mutate(order.id)}
            disabled={cancelOrder.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-tb-input border border-red-500/30 bg-red-500/5 text-red-300 font-semibold text-sm cursor-pointer hover:bg-red-500/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <XCircle size={15} />
            {cancelOrder.isPending ? 'Đang hủy...' : 'Hủy đơn'}
          </button>
        )}
      </div>
      {getPaymentUrl.isError && (
        <p className="mt-3 mb-0 font-body text-sm text-accent-red">
          {getPaymentUrl.error instanceof Error
            ? getPaymentUrl.error.message
            : 'Không thể lấy đường dẫn thanh toán. Vui lòng thử lại.'}
        </p>
      )}
      {cancelOrder.isError && (
        <p className="mt-3 mb-0 font-body text-sm text-accent-red">
          Không thể hủy đơn hàng. Vui lòng thử lại.
        </p>
      )}
    </div>
  );
}
