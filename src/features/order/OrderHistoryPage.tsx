import { useState, useEffect, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api';
import { useAuthContext } from '@/context/AuthContext';
import type { Order } from '@/types';

const STATUS_LABEL: Record<string, string> = { pending: 'Chờ xử lý', completed: 'Hoàn thành', canceled: 'Đã hủy' };
const STATUS_COLOR: Record<string, string> = { pending: '#f59e0b', completed: '#10b981', canceled: '#ef4444' };

const formatPrice = (val: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val ?? 0);

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export default function OrderHistoryPage(): ReactElement {
  const navigate = useNavigate();
  const { currentUser } = useAuthContext();
  if (!currentUser) return <></>;
  const userId = currentUser.id;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        setLoading(true);
        const data = await api.orders.getByUser(userId);
        const list = Array.isArray(data) ? data : ((data as { orders?: Order[] })?.orders ?? []);
        setOrders(list);
      } catch (err) {
        setError(err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Lỗi tải đơn hàng');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [userId]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate('/')} aria-label="Quay lại" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '14px' }}>
          ← Quay lại
        </button>
        <h1 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '18px', fontWeight: 600 }}>Lịch sử đơn hàng</h1>
      </div>

      <div style={{ maxWidth: '600px', margin: '20px auto', padding: '0 16px' }}>
        {loading && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Đang tải...</div>}
        {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}
        {!loading && !error && orders.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
            <p>Bạn chưa có đơn hàng nào</p>
          </div>
        )}
        {orders.map((order) => (
          <div key={order.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '12px', overflow: 'hidden' }}>
            <div onClick={() => setExpanded(expanded === order.id ? null : order.id)}
              style={{ padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px', color: 'var(--text-primary)' }}>Đơn #{order.id}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formatDate(order.created_at)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '4px' }}>{formatPrice(order.total)}</div>
                <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: (STATUS_COLOR[order.status] ?? '#6b7280') + '20', color: STATUS_COLOR[order.status] ?? '#6b7280', fontWeight: 500 }}>
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>
            </div>
            {expanded === order.id && Array.isArray(order.items) && order.items.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px' }}>
                {order.items.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-primary)' }}>Product #{item.product_id} × {item.quantity}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{formatPrice(item.price * item.quantity)}</span>
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
