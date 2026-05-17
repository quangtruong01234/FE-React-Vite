import { type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';

const formatPrice = (val: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val ?? 0);

export default function CartSidebar(): ReactElement | null {
  const { items, updateQty, removeItem, isOpen, closeCart, totalPrice } = useCart();
  const navigate = useNavigate();

  if (!isOpen) return null;

  function handleCheckout(): void {
    closeCart();
    void navigate('/checkout');
  }

  return (
    <>
      <div onClick={closeCart} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, width: '360px', maxWidth: '100vw', height: '100vh', background: 'var(--bg-surface)', border: '1px solid var(--border)', zIndex: 101, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.4)' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Giỏ hàng ({items.length})</h2>
          <button onClick={closeCart} style={{ border: 'none', background: 'none', fontSize: '22px', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛒</div>
              <p>Giỏ hàng trống</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.productId} style={{ display: 'flex', gap: '12px', marginBottom: '16px', padding: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                <img
                  src={item.image || 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=80'}
                  alt={item.name}
                  style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=80'; }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{item.name}</p>
                  <p style={{ margin: '0 0 8px', color: 'var(--accent-primary)', fontWeight: 600, fontSize: '13px' }}>{formatPrice(item.price)}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => updateQty(item.productId, item.quantity - 1)} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '16px' }}>-</button>
                    <span style={{ fontSize: '14px', fontWeight: 600, minWidth: '20px', textAlign: 'center', color: 'var(--text-primary)' }}>{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= item.stockQuantity}
                      style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '16px', cursor: item.quantity >= item.stockQuantity ? 'not-allowed' : 'pointer', opacity: item.quantity >= item.stockQuantity ? 0.4 : 1 }}
                    >+</button>
                    <button onClick={() => removeItem(item.productId)} style={{ marginLeft: 'auto', border: 'none', background: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '18px' }}>🗑</button>
                  </div>
                  {item.quantity >= item.stockQuantity && (
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--accent-amber)' }}>Đã đạt giới hạn tồn kho</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '16px' }}>
              <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Tổng cộng</span>
              <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--accent-primary)' }}>{formatPrice(totalPrice)}</span>
            </div>
            <button onClick={handleCheckout} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', color: 'white', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}>
              Đặt hàng ngay
            </button>
          </div>
        )}
      </div>
    </>
  );
}
