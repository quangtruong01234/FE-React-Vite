import { useEffect, useRef, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, CreditCard, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { useRemoveCartItem, useClearCart } from '@/hooks/data/useCart';
import { getPendingCheckout, clearPendingCheckout } from '@/features/cart/pendingCheckout';
import { resolveResultOrderId } from './paymentResultParams';
import { resolvePaymentVerdict } from './paymentResultVerdict';
import { GradientButton } from '@/components/shared/GradientButton';
import { cn } from '@/lib/format/utils';
import { queryKeys } from '@/hooks/query/queryKeys';
import { useT } from '@/hooks/ui/useT';
import { paymentMessages } from './payment.i18n';

const SECONDARY_LINK = cn(
  'w-full px-4 py-2.5 rounded-tb-input border border-bdr bg-canvas-elevated',
  'text-ink-pri font-semibold text-sm text-center hover:border-accent-amber transition-colors block',
);

export default function PaymentResultPage(): ReactElement {
  const [searchParams] = useSearchParams();
  const t = useT(paymentMessages);

  const params = Object.fromEntries(searchParams.entries());
  // `orderId` is only set when `order` is a routable public id. Today the gateway
  // sends the internal numeric id, so this is `''` and the page links to the order
  // list — see `resolveResultOrderId` for the evidence. Multi-seller payments omit
  // `order` entirely, which lands in the same branch.
  const orderId = resolveResultOrderId(searchParams.get('order'));
  const method = searchParams.get('method') ?? (searchParams.has('vnp_TxnRef') ? 'vnpay' : 'zalopay');
  const gateway = method === 'vnpay' ? 'VNPay' : 'ZaloPay';

  // `retry: false` stays: a verify call is not idempotent-safe to hammer, and a
  // silent retry loop only delays the panel. The cost of not retrying is handled
  // by the `unverified` verdict instead of by asserting failure.
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.payment.result(params),
    queryFn: () => api.payment.getResult(params),
    enabled: Object.keys(params).length > 0,
    retry: false,
  });

  const verdict = resolvePaymentVerdict(data, isError);
  const isSuccess = verdict === 'success';

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
            <CreditCard size={28} className="text-accent-amber shrink-0" />
          </div>
          <div>
            <h2 className="font-display font-black text-2xl text-ink-pri m-0 mb-1">
              {t('verifying')}
            </h2>
            <p className="text-sm text-ink-sec m-0">{t('waitingGateway', { gateway })}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-base flex items-center justify-center p-4">
      <div className="bg-canvas-surface border border-bdr rounded-2xl p-10 max-w-md w-full flex flex-col items-center gap-5 text-center">
        {verdict === 'success' && (
          <>
            <div className="size-20 rounded-full bg-tb-green/15 grid place-items-center">
              <CheckCircle size={44} className="text-accent-green shrink-0" />
            </div>
            <div>
              <h2 className="font-display font-black text-2xl text-ink-pri m-0 mb-1">
                {t('successTitle')}
              </h2>
              <p className="text-sm text-ink-sec m-0">
                {orderId ? (
                  <>
                    {t('orderPaidBefore')} <span className="font-mono text-accent-amber">#{orderId}</span>{' '}
                    {t('orderPaidAfter', { gateway })}
                  </>
                ) : (
                  t('yourOrderPaid', { gateway })
                )}
              </p>
            </div>
            <div className="w-full flex flex-col gap-2.5">
              <Link to={orderId ? `/order/${orderId}` : '/orders'}>
                <GradientButton className="w-full">
                  {t(orderId ? 'viewOrder' : 'viewMyOrders')}
                </GradientButton>
              </Link>
              <Link to="/" className={SECONDARY_LINK}>
                {t('home')}
              </Link>
            </div>
          </>
        )}

        {verdict === 'failed' && (
          <>
            <div className="size-20 rounded-full bg-tb-red/15 grid place-items-center">
              <XCircle size={44} className="text-accent-red shrink-0" />
            </div>
            <div>
              <h2 className="font-display font-black text-2xl text-ink-pri m-0 mb-1">
                {t('failedTitle')}
              </h2>
              <p className="text-sm text-ink-sec m-0">
                {t('failedBody', { gateway })}
              </p>
            </div>
            <div className="w-full flex flex-col gap-2.5">
              {orderId && (
                <Link to={`/order/${orderId}`}>
                  <GradientButton className="w-full">
                    {t('backToOrder')}
                  </GradientButton>
                </Link>
              )}
              <Link to="/orders" className={SECONDARY_LINK}>
                {t('allOrders')}
              </Link>
            </div>
          </>
        )}

        {verdict === 'unverified' && (
          <>
            <div className="size-20 rounded-full bg-tb-amber/15 grid place-items-center">
              <AlertTriangle size={44} className="text-accent-amber shrink-0" />
            </div>
            <div>
              <h2 className="font-display font-black text-2xl text-ink-pri m-0 mb-1">
                {t('unverifiedTitle')}
              </h2>
              <p className="text-sm text-ink-sec m-0">
                {t('unverifiedBody', { gateway })}
              </p>
            </div>
            <div className="w-full flex flex-col gap-2.5">
              <Link to={orderId ? `/order/${orderId}` : '/orders'} className="w-full">
                <GradientButton className="w-full">
                  {t(orderId ? 'checkOrder' : 'viewMyOrders')}
                </GradientButton>
              </Link>
              <Link to="/" className={SECONDARY_LINK}>
                {t('home')}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
