import { useState, useEffect, type ReactElement } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/api';
import { useCart } from '@/context/CartContext';
import type { CartItem, ProductWithInventory } from '@/types';

const formatPrice = (val: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val ?? 0);

export default function ProductDetail(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { items, addItem, openCart } = useCart();

  const [detail, setDetail] = useState<ProductWithInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    async function load(): Promise<void> {
      try {
        const data = await api.products.getWithInventory(Number(id));
        if (mounted) setDetail(data);
      } catch {
        // fallback: stay on loading=false with null detail
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>Đang tải...</div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Không tìm thấy sản phẩm.</p>
        <button onClick={() => navigate('/')} style={{ marginTop: '12px', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'pointer' }}>
          Quay lại
        </button>
      </div>
    );
  }

  const inventory = detail.inventory;
  const available = inventory?.availableStock ?? null;
  const isLowStock = inventory?.isLowStock ?? false;
  const maxQty = available != null ? Math.min(available, 99) : 99;
  const inCart = items.find((i) => i.productId === detail.id);

  function handleAddToCart(): void {
    const cartItem: CartItem = {
      productId: detail!.id,
      name: detail!.name,
      price: Number(detail!.price),
      image: detail!.imageUrl ?? '',
      quantity,
      stockQuantity: available ?? 99,
    };
    addItem(cartItem);
    openCart();
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate('/')} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '14px' }}>
          ← Quay lại
        </button>
        <h1 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '18px', fontWeight: 600 }}>Chi tiết sản phẩm</h1>
      </div>

      <div style={{ maxWidth: '500px', margin: '20px auto', padding: '0 16px' }}>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
          <img
            src={detail.imageUrl ?? 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600'}
            alt={detail.name}
            style={{ width: '100%', height: '260px', objectFit: 'cover' }}
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600'; }}
          />
          <div style={{ padding: '20px' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{detail.name}</h2>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '12px' }}>{formatPrice(detail.price)}</div>

            {detail.description && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '16px' }}>{detail.description}</p>
            )}

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {detail.brand?.name && (
                <span style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent-primary)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500 }}>
                  {detail.brand.name}
                </span>
              )}
              {detail.category?.name && (
                <span style={{ background: 'rgba(6,182,212,0.15)', color: 'var(--accent-cyan)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500 }}>
                  {detail.category.name}
                </span>
              )}
              {detail.sku && (
                <span style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}>
                  SKU: {detail.sku}
                </span>
              )}
            </div>

            {available !== null && (
              <div style={{ background: isLowStock ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${isLowStock ? 'var(--accent-amber)' : 'var(--accent-green)'}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '14px' }}>
                <span style={{ color: isLowStock ? 'var(--accent-amber)' : 'var(--accent-green)', fontWeight: 500 }}>
                  {available > 0 ? `Còn ${available} sản phẩm${isLowStock ? ' (sắp hết)' : ''}` : 'Hết hàng'}
                </span>
              </div>
            )}

            {available !== 0 && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>Số lượng</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                  <span style={{ fontSize: '18px', fontWeight: 600, minWidth: '24px', textAlign: 'center', color: 'var(--text-primary)' }}>{quantity}</span>
                  <button onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))} disabled={quantity >= maxQty} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: quantity >= maxQty ? 0.4 : 1 }}>+</button>
                </div>
              </div>
            )}

            <button
              onClick={handleAddToCart}
              disabled={available === 0}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: inCart ? 'var(--accent-green)' : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', color: 'white', fontSize: '16px', fontWeight: 600, cursor: available === 0 ? 'not-allowed' : 'pointer', opacity: available === 0 ? 0.5 : 1 }}
            >
              {available === 0 ? 'Hết hàng' : inCart ? `Thêm vào giỏ (+${quantity})` : 'Thêm vào giỏ hàng'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
