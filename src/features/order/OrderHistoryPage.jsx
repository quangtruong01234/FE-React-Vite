import { useState, useEffect } from 'react';
import { api } from '../../shared/services/api.js';

const STATUS_LABEL = { pending: 'Chờ xử lý', completed: 'Hoàn thành', canceled: 'Đã hủy' };
const STATUS_COLOR = { pending: '#f59e0b', completed: '#10b981', canceled: '#ef4444' };

const formatPrice = (val) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val ?? 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export default function OrderHistoryPage({ currentUser, onBack }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await api.order.getByUser(currentUser.id);
        const list = Array.isArray(data) ? data : (data?.orders ?? []);
        setOrders(list);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser.id]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '0' }}>
      <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '8px 12px', color: 'white', cursor: 'pointer', fontSize: '14px' }}>
          ← Quay lại
        </button>
        <h1 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: 600 }}>Lịch sử đơn hàng</h1>
      </div>

      <div style={{ maxWidth: '600px', margin: '20px auto', padding: '0 16px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Đang tải...</div>
        )}

        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
            <p>Bạn chưa có đơn hàng nào</p>
          </div>
        )}

        {orders.map((order) => (
          <div key={order.id} style={{ background: 'white', borderRadius: '12px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div
              onClick={() => setExpanded(expanded === order.id ? null : order.id)}
              style={{ padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>Đơn #{order.id}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{formatDate(order.created_at)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600, color: '#6366f1', marginBottom: '4px' }}>{formatPrice(order.total)}</div>
                <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: STATUS_COLOR[order.status] + '20', color: STATUS_COLOR[order.status], fontWeight: 500 }}>
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>
            </div>

            {expanded === order.id && Array.isArray(order.items) && order.items.length > 0 && (
              <div style={{ borderTop: '1px solid #f3f4f6', padding: '12px 16px' }}>
                {order.items.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' }}>
                    <span style={{ color: '#374151' }}>Product #{item.product_id} × {item.quantity}</span>
                    <span style={{ color: '#6b7280' }}>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
