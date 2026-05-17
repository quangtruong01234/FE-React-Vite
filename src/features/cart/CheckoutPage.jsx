import { useState } from 'react';
import { api } from '../../shared/services/api.js';

const formatPrice = (val) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val ?? 0);

export default function CheckoutPage({ cartItems, onBack, onOrderSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  async function handlePlaceOrder() {
    setLoading(true);
    setError('');

    try {
      const productIds = cartItems.map((item) => parseInt(item.product_id, 10));
      const stockData = await api.product.getMultipleWithInventory(productIds);
      const stockMap = {};
      for (const p of stockData) {
        stockMap[String(p.id)] = p.inventory?.availableStock ?? 0;
      }
      const overStock = cartItems.filter(
        (item) => item.quantity > (stockMap[String(item.product_id)] ?? 0)
      );
      if (overStock.length > 0) {
        const names = overStock
          .map((i) => `"${i.name}" (còn ${stockMap[String(i.product_id)] ?? 0}, đang chọn ${i.quantity})`)
          .join('; ');
        setError(`Số lượng vượt tồn kho: ${names}`);
        setLoading(false);
        return;
      }
    } catch {
      // nếu không fetch được stock thì bỏ qua, để backend validate
    }

    try {
      const items = cartItems.map(item => ({
        product_id: parseInt(item.product_id, 10),
        quantity: item.quantity,
        price: parseFloat(item.price),
      }));
      const result = await api.order.create(items);
      const order = result?.data ?? result;
      onOrderSuccess(order);
    } catch (err) {
      setError(err.message || 'Đặt hàng thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '8px 12px', color: 'white', cursor: 'pointer', fontSize: '14px' }}>
          ← Quay lại
        </button>
        <h1 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: 600 }}>Xác nhận đơn hàng</h1>
      </div>

      <div style={{ maxWidth: '500px', margin: '20px auto', padding: '0 16px' }}>
        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '16px' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #f3f4f6', fontWeight: 600, fontSize: '15px' }}>Sản phẩm</div>
          {cartItems.map((item) => (
            <div key={item.product_id} style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f9fafb' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: '14px' }}>{item.name}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{formatPrice(item.price)} × {item.quantity}</div>
              </div>
              <div style={{ fontWeight: 600, color: '#6366f1', fontSize: '14px' }}>{formatPrice(item.price * item.quantity)}</div>
            </div>
          ))}
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#374151' }}>Tổng thanh toán</span>
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#6366f1' }}>{formatPrice(total)}</span>
          </div>
        </div>

        <button
          onClick={handlePlaceOrder}
          disabled={loading}
          style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: loading ? '#9ca3af' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontSize: '17px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Đang đặt hàng...' : 'Xác nhận đặt hàng'}
        </button>
      </div>
    </div>
  );
}
