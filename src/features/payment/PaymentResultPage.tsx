import { useEffect, useRef, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, CreditCard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { useRemoveCartItem, useClearCart } from '@/hooks/data/useCart';
import { getPendingCheckout, clearPendingCheckout } from '@/features/cart/pendingCheckout';
import { resolveResultOrderId } from './paymentResultParams';
import { GradientButton } from '@/components/shared/GradientButton';
import { cn } from '@/lib/format/utils';
import { queryKeys } from '@/hooks/query/queryKeys';

export default function PaymentResultPage(): ReactElement {
  const [searchParams] = useSearchParams();

  const params = Object.fromEntries(searchParams.entries());
  // `orderId` is only set when `order` is a routable public id. Today the gateway
  // sends the internal numeric id, so this is `''` and the page links to the order
  // list — see `resolveResultOrderId` for the evidence. Multi-seller payments omit
  // `order` entirely, which lands in the same branch.
  const orderId = resolveResultOrderId(searchParams.get('order'));
  const method = searchParams.get('method') ?? (searchParams.has('vnp_TxnRef') ? 'vnpay' : 'zalopay');
  const gwLabel = method === 'vnpay' ? 'VNPay' : 'ZaloPay';

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.payment.result(params),
    queryFn: () => api.payment.getResult(params),
    enabled: Object.keys(params).length > 0,
    retry: false,
  });

  const isSuccess = data?.status === 'success' || data?.status === '1' || data?.status === '00';

  const removeCartItem = useRemoveCartItem();
  const clearCart = useClearCart();
  const consumedRef = useRef(false);

  // P0-04: the cart was deliberately kept intact through the gateway redirect.
  // Now that payment is confirmed successful, remove exactly the items this
  // checkout covered. A failed/cancelled payment never reaches here, so the
  // cart survives for a retry.
  useEffect(() => {
    if (!isSuccess || consumedRef.current) return;
    const pending = getPendingCheckout();
    if (!pending) return;
    consumedRef.current = true;
    if (pending.clearAll) {
      clearCart.mutate();
    } else {
      pending.cartItemIds.forEach((id) => removeCartItem.mutate(id));
    }
    clearPendingCheckout();
  }, [isSuccess, clearCart, removeCartItem]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas-base flex items-center justify-center p-4">
        <div className="bg-canvas-surface border border-bdr rounded-2xl p-10 max-w-md w-full flex flex-col items-center gap-5 text-center">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full border-4 border-tb-amber/20" />
            <span className="absolute inset-0 rounded-full border-4 border-transparent border-t-tb-amber animate-spin" />
            <CreditCard size={28} className="text-accent-amber" />
          </div>
          <div>
            <h2 className="font-display font-black text-2xl text-white m-0 mb-1">
              Đang xác nhận thanh toán…
            </h2>
            <p className="text-sm text-ink-sec m-0">Đang chờ phản hồi từ cổng {gwLabel}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-base flex items-center justify-center p-4">
      <div className="bg-canvas-surface border border-bdr rounded-2xl p-10 max-w-md w-full flex flex-col items-center gap-5 text-center">
        {isSuccess ? (
          <>
            <div className="w-20 h-20 rounded-full bg-tb-green/15 flex items-center justify-center">
              <CheckCircle size={44} className="text-accent-green" />
            </div>
            <div>
              <h2 className="font-display font-black text-2xl text-white m-0 mb-1">
                Thanh toán thành công!
              </h2>
              <p className="text-sm text-ink-sec m-0">
                {orderId ? (
                  <>
                    Đơn hàng <span className="font-mono text-accent-amber">#{orderId}</span> đã
                    được thanh toán qua {gwLabel}.
                  </>
                ) : (
                  <>Đơn hàng của bạn đã được thanh toán qua {gwLabel}.</>
                )}
              </p>
            </div>
            <div className="w-full flex flex-col gap-2.5">
              <Link to={orderId ? `/order/${orderId}` : '/orders'}>
                <GradientButton className="w-full">
                  {orderId ? 'Xem chi tiết đơn hàng →' : 'Xem đơn hàng của tôi →'}
                </GradientButton>
              </Link>
              <Link
                to="/"
                className={cn(
                  'w-full px-4 py-2.5 rounded-tb-input border border-bdr bg-canvas-elevated',
                  'text-ink-pri font-semibold text-sm text-center hover:border-accent-amber transition-colors block',
                )}
              >
                Về trang chủ
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-tb-red/15 flex items-center justify-center">
              <XCircle size={44} className="text-accent-red" />
            </div>
            <div>
              <h2 className="font-display font-black text-2xl text-white m-0 mb-1">
                Thanh toán thất bại
              </h2>
              <p className="text-sm text-ink-sec m-0">
                Giao dịch qua {gwLabel} không thành công. Vui lòng thử lại.
              </p>
            </div>
            <div className="w-full flex flex-col gap-2.5">
              {orderId && (
                <Link to={`/order/${orderId}`}>
                  <GradientButton className="w-full">
                    Quay lại đơn hàng
                  </GradientButton>
                </Link>
              )}
              <Link
                to="/orders"
                className={cn(
                  'w-full px-4 py-2.5 rounded-tb-input border border-bdr bg-canvas-elevated',
                  'text-ink-pri font-semibold text-sm text-center hover:border-accent-amber transition-colors block',
                )}
              >
                Xem tất cả đơn hàng
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
