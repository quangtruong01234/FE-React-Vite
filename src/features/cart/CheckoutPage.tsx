import { useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api';
import { useCart } from '@/context/CartContext';
import type { Order } from '@/types';

const formatPrice = (val: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val ?? 0);

export default function CheckoutPage(): ReactElement {
  const navigate = useNavigate();
  const { items, clearCart, totalPrice } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handlePlaceOrder(): Promise<void> {
    setLoading(true);
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
        setLoading(false);
        return;
      }
    } catch {
      // skip stock check on error — backend will validate
    }

    try {
      const orderItems = items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price,
      }));
      const result = await api.orders.create(orderItems);
      const order = (result as { data?: Order } & Order).data ?? result;
      clearCart();
      alert(`Đặt hàng thành công! Mã đơn hàng: #${order?.id ?? ''}`);
      void navigate('/orders');
    } catch (err: unknown) {
      const msg = typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Đặt hàng thất bại. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '14px' }}>
          ← Quay lại
        </button>
        <h1 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '18px', fontWeight: 600 }}>Xác nhận đơn hàng</h1>
      </div>

      <div style={{ maxWidth: '500px', margin: '20px auto', padding: '0 16px' }}>
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>Sản phẩm</div>
          {items.map((item) => (
            <div key={item.productId} style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)' }}>{item.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formatPrice(item.price)} × {item.quantity}</div>
              </div>
              <div style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: '14px' }}>{formatPrice(item.price * item.quantity)}</div>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Tổng thanh toán</span>
            <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--accent-primary)' }}>{formatPrice(totalPrice)}</span>
          </div>
        </div>

        <button
          onClick={() => void handlePlaceOrder()}
          disabled={loading}
          style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: loading ? 'var(--text-secondary)' : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', color: 'white', fontSize: '17px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Đang đặt hàng...' : 'Xác nhận đặt hàng'}
        </button>
      </div>
    </div>
  );
}
