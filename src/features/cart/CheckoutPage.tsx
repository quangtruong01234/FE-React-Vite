import { useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Banknote, CreditCard, Wallet, Landmark } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { useCart } from '@/context/CartContext';
import { formatPrice, cn } from '@/lib/utils';
import { GradientButton } from '@/components/shared/GradientButton';
import { TextField } from '@/components/shared/TextField';
import type { Order } from '@/types';

const PAYMENT_METHODS = [
  { id: 'cod',  label: 'Thanh toán khi nhận hàng (COD)', Icon: Banknote,   available: true },
  { id: 'card', label: 'Thẻ tín dụng / Ghi nợ',          Icon: CreditCard, available: false },
  { id: 'momo', label: 'Ví MoMo / ZaloPay',               Icon: Wallet,     available: false },
  { id: 'bank', label: 'Chuyển khoản ngân hàng',          Icon: Landmark,   available: false },
];

export default function CheckoutPage(): ReactElement {
  const navigate = useNavigate();
  const { items, clearCart, totalPrice } = useCart();
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  // Address fields — UI only, does not affect handlePlaceOrder
  const [addrName, setAddrName]   = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [payment, setPayment] = useState('cod');

  const { mutateAsync: placeOrder, isPending: loading } = useMutation({
    mutationFn: (orderItems: { product_id: number; quantity: number; price: number }[]) =>
      api.orders.create(orderItems),
    onSuccess: (result) => {
      const order = (result as { data?: Order } & Order).data ?? result;
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      clearCart();
      alert(`Đặt hàng thành công! Mã đơn hàng: #${order?.id ?? ''}`);
      void navigate('/orders');
    },
    onError: (err: unknown) => {
      const msg = typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Đặt hàng thất bại. Vui lòng thử lại.';
      setError(msg);
    },
  });

  async function handlePlaceOrder(): Promise<void> {
    setError('');

    try {
      const productIds = items.map((item) => item.productId);
      const stockData = await api.products.getMultipleWithInventory(productIds);
      const stockMap: Record<string, number> = {};
      for (const p of stockData) {
        stockMap[String(p.id)] = p.inventory?.availableStock ?? 0;
      }
      const overStock = items.filter((item) => item.quantity > (stockMap[String(item.productId)] ?? 0));
      if (overStock.length > 0) {
        const names = overStock
          .map((i) => `"${i.name}" (còn ${stockMap[String(i.productId)] ?? 0}, đang chọn ${i.quantity})`)
          .join('; ');
        setError(`Số lượng vượt tồn kho: ${names}`);
        return;
      }
    } catch {
      // skip stock check on error — backend will validate
    }

    const orderItems = items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price,
    }));
    await placeOrder(orderItems);
  }

  return (
    <div className="min-h-screen bg-canvas-base">
      {/* Header */}
      <div className="bg-canvas-surface border-b border-bdr px-5 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="bg-canvas-elevated border border-bdr rounded-lg px-3 py-2 text-ink-pri cursor-pointer text-sm hover:border-accent-amber transition-colors inline-flex items-center gap-1.5">
          <ArrowLeft size={16} /> Quay lại
        </button>
        <h1 className="font-display text-xl font-black uppercase tracking-wide text-ink-pri m-0">
          Xác nhận đơn hàng
        </h1>
      </div>

      <div className="max-w-[500px] mx-auto mt-5 px-4 pb-8 flex flex-col gap-4">
        {error && (
          <div className="bg-red-950/30 border border-accent-red text-accent-red px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Address section */}
        <div className="bg-canvas-elevated rounded-tb-card border border-bdr p-5 flex flex-col gap-4">
          <h2 className="m-0 font-display font-bold text-base uppercase tracking-[0.04em] text-white">
            1. Địa chỉ giao hàng
          </h2>
          <div className="flex flex-col gap-[14px]">
            <TextField
              label="Họ và tên"
              placeholder="Nguyễn Văn A"
              value={addrName}
              onChange={(e) => setAddrName(e.target.value)}
              autoComplete="name"
            />
            <TextField
              label="Số điện thoại"
              placeholder="098 *** ***"
              value={addrPhone}
              onChange={(e) => setAddrPhone(e.target.value)}
              autoComplete="tel"
            />
            <TextField
              label="Địa chỉ"
              placeholder="Số nhà, tên đường, phường/xã, quận/huyện"
              value={addrStreet}
              onChange={(e) => setAddrStreet(e.target.value)}
              autoComplete="street-address"
            />
          </div>
        </div>

        {/* Payment method */}
        <div className="bg-canvas-elevated rounded-tb-card border border-bdr p-5 flex flex-col gap-4">
          <h2 className="m-0 font-display font-bold text-base uppercase tracking-[0.04em] text-white">
            2. Phương thức thanh toán
          </h2>
          <div className="flex flex-col gap-[10px]">
            {PAYMENT_METHODS.map(({ id, label, Icon, available }) => {
              const active = payment === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => available && setPayment(id)}
                  className={cn(
                    'flex items-center gap-[14px] px-[18px] py-[14px] text-left rounded-tb-cta border w-full',
                    active ? 'bg-amber-400/[0.08] border-amber-400/50' : 'bg-tb-elevated border-tb-border',
                    !available && 'cursor-default pointer-events-none opacity-50',
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
                    {label}
                  </span>
                  {!available && (
                    <span className="px-2 py-[3px] rounded-tb-pill bg-amber-400/[0.12] border border-amber-400/30 text-tb-amber font-body font-semibold text-[11px] whitespace-nowrap">
                      Sắp ra mắt
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Product list */}
        <div className="bg-canvas-surface border border-bdr rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-bdr">
            <span className="font-display font-bold uppercase text-sm tracking-wide text-ink-sec">
              3. Sản phẩm ({items.length})
            </span>
          </div>
          {items.map((item) => (
            <div key={item.productId} className="px-4 py-3 flex justify-between items-center border-b border-bdr last:border-b-0 gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm text-ink-pri truncate">{item.name}</div>
                <div className="text-xs text-ink-sec mt-0.5">
                  <span className="font-mono text-accent-amber">{formatPrice(item.price)}</span>
                  {' '}× {item.quantity}
                </div>
              </div>
              <div className="font-mono font-bold text-sm text-ink-pri flex-shrink-0">
                {formatPrice(item.price * item.quantity)}
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="bg-canvas-surface border border-bdr rounded-xl px-4 py-4">
          <div className="flex justify-between items-center mb-2 text-sm text-ink-sec">
            <span>Tạm tính</span>
            <span className="font-mono">{formatPrice(totalPrice)}</span>
          </div>
          <div className="flex justify-between items-center mb-3 text-sm text-ink-sec">
            <span>Phí vận chuyển</span>
            <span className="text-accent-green font-medium">Miễn phí</span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-bdr">
            <span className="font-semibold text-ink-pri">Tổng thanh toán</span>
            <span className="font-mono font-black text-2xl text-accent-amber">{formatPrice(totalPrice)}</span>
          </div>
        </div>

        {/* CTA */}
        <GradientButton
          onClick={() => void handlePlaceOrder()}
          disabled={loading}
          className="w-full py-4 text-lg font-bold rounded-xl">
          {loading ? 'Đang đặt hàng...' : 'XÁC NHẬN ĐẶT HÀNG →'}
        </GradientButton>
      </div>
    </div>
  );
}
