import { type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils';
import { GradientButton } from '@/components/shared/GradientButton';

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
      {/* Backdrop */}
      <div onClick={closeCart} className="fixed inset-0 bg-black/70 z-[100]" />

      {/* Drawer */}
      <div className="fixed top-0 right-0 w-[360px] max-w-full h-screen bg-canvas-surface border-l border-bdr z-[101] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-bdr flex items-center justify-between">
          <h2 className="m-0 font-display text-xl font-black uppercase tracking-wide text-ink-pri">
            Giỏ hàng
            {items.length > 0 && (
              <span className="ml-2 text-sm font-body font-normal text-ink-sec">({items.length} sản phẩm)</span>
            )}
          </h2>
          <button
            onClick={closeCart}
            className="border-0 bg-transparent text-xl cursor-pointer text-ink-sec hover:text-ink-pri transition-colors leading-none p-1 rounded-lg hover:bg-canvas-elevated">
            ✕
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {items.length === 0 ? (
            <div className="text-center py-16 px-5 text-ink-sec flex flex-col items-center gap-3">
              <div className="text-5xl">🛒</div>
              <p className="m-0 text-sm">Giỏ hàng trống</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="flex gap-3 p-3 bg-canvas-elevated border border-bdr rounded-xl">
                <img
                  src={item.image || 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=80'}
                  alt={item.name}
                  className="w-24 h-24 object-cover rounded-lg flex-shrink-0 border border-bdr"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=80';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="m-0 mb-1 font-semibold text-sm text-ink-pri truncate">{item.name}</p>
                  <p className="m-0 mb-2 font-mono font-bold text-sm text-accent-amber">{formatPrice(item.price)}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.productId, item.quantity - 1)}
                      className="w-7 h-7 rounded-md border border-bdr bg-canvas-surface text-ink-pri cursor-pointer flex items-center justify-center hover:border-accent-amber transition-colors">
                      <Minus size={13} />
                    </button>
                    <span className="font-mono text-sm font-bold min-w-[20px] text-center text-ink-pri">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= item.stockQuantity}
                      className="w-7 h-7 rounded-md border border-bdr bg-canvas-surface text-ink-pri flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer enabled:hover:border-accent-amber">
                      <Plus size={13} />
                    </button>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="ml-auto border-0 bg-transparent text-ink-sec cursor-pointer leading-none hover:text-accent-red transition-colors flex items-center">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {item.quantity >= item.stockQuantity && (
                    <p className="mt-1 text-[11px] text-accent-amber m-0">Đã đạt giới hạn tồn kho</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-bdr">
            <div className="flex justify-between items-center mb-1 text-sm text-ink-sec">
              <span>Tạm tính</span>
              <span className="font-mono text-ink-pri">{formatPrice(totalPrice)}</span>
            </div>
            <div className="flex justify-between items-center mb-4 text-sm text-ink-sec">
              <span>Phí vận chuyển</span>
              <span className="text-accent-green font-medium">Miễn phí</span>
            </div>
            <div className="flex justify-between items-center mb-4 text-base border-t border-bdr pt-3">
              <span className="font-semibold text-ink-pri">Tổng cộng</span>
              <span className="font-mono font-bold text-lg text-accent-amber">{formatPrice(totalPrice)}</span>
            </div>
            <GradientButton onClick={handleCheckout} className="w-full py-3.5 text-base">
              ĐẶT HÀNG NGAY →
            </GradientButton>
          </div>
        )}
      </div>
    </>
  );
}
