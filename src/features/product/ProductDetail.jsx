import { useState, useEffect } from 'react';
import { api } from '../../shared/services/api.js';

const formatPrice = (val) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val ?? 0);

export default function ProductDetail({ product, onBack, onAddToCart, cartItems }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  const inCart = cartItems?.find(i => i.product_id === product.id);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.product.getWithInventory(product.id);
        const item = data?.data ?? data;
        setDetail(item);
      } catch {
        setDetail(product);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [product.id]);

  const info = detail ?? product;
  const inventory = info.inventory;
  const available = inventory?.availableStock ?? null;
  const isLowStock = inventory?.isLowStock ?? false;
  const maxQty = available != null ? Math.min(available, 99) : 99;

  function handleAddToCart() {
    onAddToCart({
      product_id: info.id,
      name: info.name,
      price: info.price,
      imageUrl: info.imageUrl,
      quantity,
      availableStock: available,
    });
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '8px 12px', color: 'white', cursor: 'pointer', fontSize: '14px' }}>
          ← Quay lại
        </button>
        <h1 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: 600 }}>Chi tiết sản phẩm</h1>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>Đang tải...</div>
      ) : (
        <div style={{ maxWidth: '500px', margin: '20px auto', padding: '0 16px' }}>
          <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <img
              src={info.imageUrl || 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600'}
              alt={info.name}
              style={{ width: '100%', height: '260px', objectFit: 'cover' }}
              onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600'; }}
            />

            <div style={{ padding: '20px' }}>
              <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: '#111827' }}>{info.name}</h2>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#6366f1', marginBottom: '12px' }}>{formatPrice(info.price)}</div>

              {info.description && (
                <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', marginBottom: '16px' }}>{info.description}</p>
              )}

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {info.brand?.name && (
                  <span style={{ background: '#ede9fe', color: '#7c3aed', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500 }}>
                    {info.brand.name}
                  </span>
                )}
                {info.category?.name && (
                  <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500 }}>
                    {info.category.name}
                  </span>
                )}
                {info.sku && (
                  <span style={{ background: '#f3f4f6', color: '#6b7280', padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}>
                    SKU: {info.sku}
                  </span>
                )}
              </div>

              {available !== null && (
                <div style={{ background: isLowStock ? '#fff7ed' : '#f0fdf4', border: `1px solid ${isLowStock ? '#fed7aa' : '#bbf7d0'}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '14px' }}>
                  <span style={{ color: isLowStock ? '#c2410c' : '#15803d', fontWeight: 500 }}>
                    {available > 0 ? `Còn ${available} sản phẩm${isLowStock ? ' (sắp hết)' : ''}` : 'Hết hàng'}
                  </span>
                </div>
              )}

              {available !== 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>Số lượng</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <span style={{ fontSize: '18px', fontWeight: 600, minWidth: '24px', textAlign: 'center' }}>{quantity}</span>
                    <button onClick={() => setQuantity(q => Math.min(maxQty, q + 1))} disabled={quantity >= maxQty} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: quantity >= maxQty ? 0.4 : 1 }}>+</button>
                  </div>
                </div>
              )}

              <button
                onClick={handleAddToCart}
                disabled={available === 0}
                title={available === 0 ? 'Sản phẩm đã hết hàng' : undefined}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: inCart ? '#10b981' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontSize: '16px', fontWeight: 600, cursor: available === 0 ? 'not-allowed' : 'pointer', opacity: available === 0 ? 0.5 : 1 }}
              >
                {available === 0 ? 'Hết hàng' : inCart ? `Thêm vào giỏ (+${quantity})` : `Thêm vào giỏ hàng`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
