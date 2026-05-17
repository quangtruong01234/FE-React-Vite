const formatPrice = (val) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val ?? 0);

export default function CartSidebar({ cartItems, onUpdateQty, onRemove, onClose, onCheckout }) {
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100 }}
      />
      <div style={{ position: 'fixed', top: 0, right: 0, width: '360px', maxWidth: '100vw', height: '100vh', background: 'white', zIndex: 101, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Giỏ hàng ({cartItems.length})</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '22px', cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {cartItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛒</div>
              <p>Giỏ hàng trống</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.product_id} style={{ display: 'flex', gap: '12px', marginBottom: '16px', padding: '12px', background: '#f9fafb', borderRadius: '10px' }}>
                <img
                  src={item.imageUrl || 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=80'}
                  alt={item.name}
                  style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=80'; }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                  <p style={{ margin: '0 0 8px', color: '#6366f1', fontWeight: 600, fontSize: '13px' }}>{formatPrice(item.price)}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => onUpdateQty(item.product_id, item.quantity - 1)} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: '16px' }}>-</button>
                    <span style={{ fontSize: '14px', fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQty(item.product_id, item.quantity + 1)}
                      disabled={item.availableStock != null && item.quantity >= item.availableStock}
                      style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', fontSize: '16px', cursor: item.availableStock != null && item.quantity >= item.availableStock ? 'not-allowed' : 'pointer', opacity: item.availableStock != null && item.quantity >= item.availableStock ? 0.4 : 1 }}
                    >+</button>
                    <button onClick={() => onRemove(item.product_id)} style={{ marginLeft: 'auto', border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' }}>🗑</button>
                  </div>
                  {item.availableStock != null && item.quantity >= item.availableStock && (
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#d97706' }}>Đã đạt giới hạn tồn kho</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '16px' }}>
              <span style={{ fontWeight: 500, color: '#6b7280' }}>Tổng cộng</span>
              <span style={{ fontWeight: 700, fontSize: '18px', color: '#6366f1' }}>{formatPrice(total)}</span>
            </div>
            <button onClick={onCheckout} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}>
              Đặt hàng ngay
            </button>
          </div>
        )}
      </div>
    </>
  );
}
