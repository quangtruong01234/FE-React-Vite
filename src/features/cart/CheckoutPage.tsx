import { useState, useEffect, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Banknote, CreditCard, Wallet, ChevronRight, CheckCircle } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkoutSchema, type CheckoutFormData } from './checkout.schema';
import { usePaymentOptions } from './usePaymentOptions';
import { api } from '@/api';
import { useCart } from '@/context/CartContext';
import type { CreateOrderDto, PaymentMethod } from '@/types';
import { formatPrice, cn } from '@/lib/utils';
import { GradientButton } from '@/components/shared/GradientButton';
import { Skeleton } from '@/components/ui/skeleton';

const PAYMENT_ICON: Record<string, typeof Banknote> = {
  cod:     Banknote,
  zalopay: Wallet,
  vnpay:   CreditCard,
};

export default function CheckoutPage(): ReactElement {
  const navigate = useNavigate();
  const { options: paymentOptions, isLoading: paymentLoading } = usePaymentOptions();
  const { items, clearCart, totalPrice, updateQty, removeItem } = useCart();
  const [stockError, setStockError] = useState<Record<number, string>>({});
  const [successOrder, setSuccessOrder] = useState<{ id: number | string } | null>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { payment_method: 'cod' },
  });

  useEffect(() => {
    if (!successOrder) return;
    const timer = setTimeout(() => void navigate('/orders'), 3000);
    return () => clearTimeout(timer);
  }, [successOrder, navigate]);

  const { mutateAsync: placeOrder, isPending: mutationPending } = useMutation({
    mutationFn: (dto: CreateOrderDto) => api.orders.create(dto),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      clearCart();
      setSuccessOrder({ id: order?.id ?? '' });
    },
  });

  const loading = mutationPending || isSubmitting;

  async function onSubmit(data: CheckoutFormData): Promise<void> {
    setStockError({});

    try {
      const productIds = items.map((item) => item.productId);
      const stockData = await api.products.getMultipleWithInventory(productIds);
      const stockMap: Record<string, number> = {};
      for (const p of stockData) {
        stockMap[String(p.id)] = p.inventory?.availableStock ?? 0;
      }
      const newStockError: Record<number, string> = {};
      for (const item of items) {
        const avail = stockMap[String(item.productId)] ?? 0;
        if (item.quantity > avail) {
          newStockError[item.productId] = `Chỉ còn ${avail} sản phẩm`;
        }
      }
      if (Object.keys(newStockError).length > 0) {
        setStockError(newStockError);
        return;
      }
    } catch {
      // skip stock check on error — backend will validate
    }

    try {
      await placeOrder({
        payment_method: data.payment_method,
        shipping_address: data.shipping_address,
        items: items.map((item) => ({
          product_id: item.productId,
          product_name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
      });
    } catch (err: unknown) {
      const msg = typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Đặt hàng thất bại. Vui lòng thử lại.';
      setError('root', { message: msg });
    }
  }

  if (successOrder) {
    return (
      <div className="min-h-screen bg-canvas-base flex items-center justify-center">
        <div className="bg-canvas-surface border border-bdr rounded-2xl p-10 max-w-md w-full mx-4 flex flex-col items-center gap-5 text-center">
          <CheckCircle size={56} className="text-accent-green" />
          <div>
            <h2 className="font-display font-black text-2xl text-white m-0 mb-1">
              Đặt hàng thành công!
            </h2>
            <p className="font-body text-sm text-ink-sec m-0">
              Mã đơn hàng: <span className="font-mono text-accent-amber">#{successOrder.id}</span>
            </p>
          </div>
          <p className="font-body text-xs text-ink-muted m-0">
            Tự động chuyển trang sau 3 giây...
          </p>
          <GradientButton onClick={() => void navigate('/orders')} className="w-full py-3">
            Xem đơn hàng →
          </GradientButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-base">
      {/* Header */}
      <div className="bg-canvas-surface border-b border-bdr px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="bg-canvas-elevated border border-bdr rounded-lg px-3 py-2 text-ink-pri cursor-pointer text-sm hover:border-accent-amber transition-colors inline-flex items-center gap-1.5">
          <ArrowLeft size={16} /> Quay lại
        </button>
        <h1 className="font-display text-xl font-black uppercase tracking-wide text-ink-pri m-0">
          Xác nhận đơn hàng
        </h1>
      </div>

      {/* Breadcrumb */}
      <div className="max-w-[1080px] mx-auto px-6 pt-5 flex items-center gap-2 font-body text-xs text-ink-muted">
        <span>Giỏ hàng</span>
        <ChevronRight size={12} />
        <span className="text-accent-amber font-semibold">Thanh toán</span>
        <ChevronRight size={12} />
        <span>Hoàn tất</span>
      </div>

      {/* Two-column layout */}
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
      <div className="max-w-[1080px] mx-auto px-6 py-6 pb-12 grid grid-cols-[1fr_380px] gap-8 items-start">

        {/* LEFT — form */}
        <div className="flex flex-col gap-4">
          {errors.root?.message && (
            <div className="bg-red-950/30 border border-accent-red text-accent-red px-4 py-3 rounded-xl text-sm">
              {errors.root.message}
            </div>
          )}

          {/* Address section */}
          <div className="bg-canvas-elevated rounded-tb-card border border-bdr p-5 flex flex-col gap-4">
            <h2 className="m-0 font-display font-bold text-base uppercase tracking-[0.04em] text-white">
              1. Địa chỉ giao hàng
            </h2>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="shipping_address" className="font-body font-[500] text-[11px] leading-[1.4] text-ink-sec tracking-[0.04em] uppercase">
                Địa chỉ giao hàng đầy đủ
              </label>
              <input
                id="shipping_address"
                placeholder="Họ tên, số điện thoại, số nhà, đường, phường, quận, tỉnh"
                autoComplete="shipping street-address"
                className={cn(
                  'h-[44px] bg-canvas-base border rounded-[10px] px-[14px] text-ink-pri font-body text-[14px] outline-none placeholder:text-ink-muted transition-[border-color,box-shadow] duration-[120ms]',
                  'focus:border-[rgba(245,158,11,0.5)] focus:shadow-[0_0_0_4px_rgba(245,158,11,0.10)]',
                  errors.shipping_address ? 'border-accent-red focus:border-accent-red focus:shadow-[0_0_0_4px_rgba(239,68,68,0.10)]' : 'border-bdr',
                )}
                {...register('shipping_address')}
              />
              {errors.shipping_address && (
                <span className="text-xs text-accent-red">{errors.shipping_address.message}</span>
              )}
            </div>
          </div>

          {/* Payment method */}
          <div className="bg-canvas-elevated rounded-tb-card border border-bdr p-5 flex flex-col gap-4">
            <h2 className="m-0 font-display font-bold text-base uppercase tracking-[0.04em] text-white">
              2. Phương thức thanh toán
            </h2>
            <Controller
              name="payment_method"
              control={control}
              render={({ field }) => (
                <div className="flex flex-col gap-[10px]">
                  {paymentLoading ? (
                    <>
                      <Skeleton className="h-[52px] rounded-tb-cta bg-canvas-elevated" />
                      <Skeleton className="h-[52px] rounded-tb-cta bg-canvas-elevated" />
                      <Skeleton className="h-[52px] rounded-tb-cta bg-canvas-elevated" />
                    </>
                  ) : (
                    paymentOptions.map(({ id, name }) => {
                      const active = field.value === id;
                      const Icon = PAYMENT_ICON[id] ?? Banknote;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => field.onChange(id as PaymentMethod)}
                          className={cn(
                            'flex items-center gap-[14px] px-[18px] py-[14px] text-left rounded-tb-cta border w-full cursor-pointer',
                            active ? 'bg-amber-400/[0.08] border-amber-400/50' : 'bg-tb-elevated border-tb-border',
                          )}
                        >
                          <span className={cn(
                            'w-5 h-5 rounded-full shrink-0 border-2 inline-flex items-center justify-center',
                            active ? 'border-tb-amber' : 'border-tb-muted',
                          )}>
                            {active && <span className="w-[10px] h-[10px] rounded-full bg-tb-amber" />}
                          </span>
                          <Icon size={18} color={active ? '#F59E0B' : '#A1A1AA'} />
                          <span className="flex-1 font-body font-semibold text-sm text-white">
                            {name}
                          </span>
                        </button>
                      );
                    })
                  )}
                  {errors.payment_method && (
                    <span className="text-xs text-accent-red">{errors.payment_method.message}</span>
                  )}
                </div>
              )}
            />
          </div>

          {/* Product list */}
          <div className="bg-canvas-surface border border-bdr rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-bdr">
              <span className="font-display font-bold uppercase text-sm tracking-wide text-ink-sec">
                3. Sản phẩm ({items.length})
              </span>
            </div>
            {items.map((item) => (
              <div key={item.productId} className={cn(
                'px-4 py-3 border-b border-bdr last:border-b-0',
                stockError[item.productId] && 'bg-red-950/20',
              )}>
                <div className="flex items-center gap-3">
                  {item.image
                    ? <img src={item.image} alt={item.name} className="w-14 h-14 rounded-[10px] object-cover flex-shrink-0 bg-canvas-elevated" />
                    : <div className="w-14 h-14 rounded-[10px] flex-shrink-0 bg-canvas-elevated border border-bdr flex items-center justify-center text-2xl">🛍️</div>
                  }
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-ink-pri truncate">{item.name}</div>
                    <div className="text-xs mt-0.5 font-mono text-accent-amber">
                      {formatPrice(item.price)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => item.quantity === 1
                        ? removeItem(item.productId)
                        : updateQty(item.productId, item.quantity - 1)
                      }
                      className="w-7 h-7 rounded-md border border-bdr bg-canvas-elevated text-ink-pri flex items-center justify-center cursor-pointer hover:border-accent-amber transition-colors text-base">
                      −
                    </button>
                    <span className="font-mono text-sm font-bold text-ink-pri min-w-[20px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= item.stockQuantity}
                      className="w-7 h-7 rounded-md border border-bdr bg-canvas-elevated text-ink-pri flex items-center justify-center transition-colors text-base enabled:cursor-pointer enabled:hover:border-accent-amber disabled:opacity-40 disabled:cursor-not-allowed">
                      +
                    </button>
                    <span className="font-mono font-bold text-sm text-ink-pri ml-2 min-w-[80px] text-right">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
                {stockError[item.productId] && (
                  <p className="text-xs text-accent-red mt-1.5 mb-0 ml-[68px]">
                    ⚠ {stockError[item.productId]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — sticky summary */}
        <div className="sticky top-[88px] flex flex-col gap-4">
          <div className="bg-canvas-surface border border-bdr rounded-xl px-4 py-4">
            <div className="flex justify-between items-center mb-2 text-sm text-ink-sec">
              <span>Tạm tính</span>
              <span className="font-mono">{formatPrice(totalPrice)}</span>
            </div>
            <div className="flex justify-between items-center mb-2 text-sm text-ink-sec">
              <span>Phí vận chuyển</span>
              <span className="text-accent-green font-medium">Miễn phí</span>
            </div>
            <div className="flex justify-between items-center mb-3 text-sm text-ink-sec">
              <span>Giảm giá</span>
              <span className="font-mono">−0 đ</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-bdr">
              <span className="font-semibold text-ink-pri">Tổng thanh toán</span>
              <span className="font-mono font-black text-2xl text-accent-amber">{formatPrice(totalPrice)}</span>
            </div>
          </div>

          <GradientButton
            type="submit"
            disabled={loading || Object.keys(stockError).length > 0}
            className="w-full py-4 text-lg font-bold rounded-xl">
            {loading ? 'Đang đặt hàng...' : 'XÁC NHẬN ĐẶT HÀNG →'}
          </GradientButton>

          <p className="text-center font-body text-xs text-gray-500 leading-relaxed m-0">
            Bằng việc đặt hàng, bạn đồng ý với{' '}
            <span className="text-gray-400 underline cursor-pointer">Điều khoản sử dụng</span>
            {' '}và{' '}
            <span className="text-gray-400 underline cursor-pointer">Chính sách bảo mật</span>
            {' '}của TryBuy.
          </p>
        </div>

      </div>
      </form>
    </div>
  );
}
