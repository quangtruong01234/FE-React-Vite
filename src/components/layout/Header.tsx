import { useState, useEffect, type ReactElement } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, MessageSquare, ShoppingCart, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GradientButton } from '@/components/shared/GradientButton';
import { useCart } from '@/hooks/useCart';
import { useRole } from '@/hooks/useRole';
import { NotificationBell } from './NotificationBell';
import { ProfileMenu } from './ProfileMenu';
import CartDrawer from '@/features/cart/CartDrawer';

export function Header(): ReactElement {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') ?? '');
  const [cartOpen, setCartOpen] = useState(false);
  const { data: cart } = useCart();

  useEffect(() => {
    const handler = () => setCartOpen(true);
    window.addEventListener('tb:opencart', handler);
    return () => window.removeEventListener('tb:opencart', handler);
  }, []);
  const roleState = useRole();
  const isSeller = roleState?.isSeller ?? false;

  const totalCount = cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  function handleSearchSubmit(e: React.FormEvent): void {
    e.preventDefault();
    void navigate(`/marketplace?search=${encodeURIComponent(searchQuery.trim())}`);
  }

  return (
    <header className="sticky top-0 z-[100] bg-canvas-surface/85 border-b border-bdr backdrop-blur-md">
      <div className="w-full px-6 py-4 flex items-center gap-5">
        <Link to="/" className="flex-none">
          <span className="font-display font-black text-[2rem] tracking-tight uppercase text-ink-pri">
            Try<span className="bg-tb-gradient-90 bg-clip-text text-transparent">Buy</span>
          </span>
        </Link>

        <form
          onSubmit={handleSearchSubmit}
          className="relative w-[520px] hidden sm:block"
        >
          <button
            type="submit"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 bg-transparent border-0 p-0 cursor-pointer"
          >
            <Search size="18" className="text-ink-muted pointer-events-none" />
          </button>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm sản phẩm, bài viết, seller…"
            className="w-full bg-canvas-elevated border border-bdr rounded-tb-input py-3 pl-11 pr-4 text-ink-pri font-body text-[15px] placeholder:text-ink-muted outline-none focus:border-accent-amber/50 transition-colors"
          />
        </form>

        <div className="flex items-center gap-3 ml-auto">
          <GradientButton
            size="sm"
            className="rounded-full px-4 py-2 text-sm"
            onClick={() => window.dispatchEvent(new CustomEvent('tb:createpost'))}
          >
            <Plus size="15" /> Tạo bài viết
          </GradientButton>

          {/* Seller channel */}
          {isSeller && (
            <Link
              to="/shop"
              aria-label="Kênh người bán"
              className="relative bg-canvas-elevated border border-bdr text-ink-pri rounded-[10px] p-2.5 flex items-center justify-center hover:border-accent-amber transition-colors"
            >
              <Store size="20" />
            </Link>
          )}

          {/* Messages */}
          <Link
            to="/messages"
            aria-label="Tin nhắn"
            className="relative bg-canvas-elevated border border-bdr text-ink-pri rounded-[10px] p-2.5 flex items-center justify-center hover:border-accent-amber transition-colors overflow-visible"
          >
            <MessageSquare size="20" />
            {/* TODO Phase 6: wire useChat unreadCount */}
          </Link>

          <NotificationBell />

          {/* Cart */}
          <button
            onClick={() => setCartOpen(true)}
            aria-label="Giỏ hàng"
            className="relative bg-canvas-elevated border border-bdr text-ink-pri rounded-[10px] p-2.5 flex items-center justify-center cursor-pointer hover:border-accent-amber transition-colors overflow-visible"
          >
            <ShoppingCart size="20" />
            {totalCount > 0 && (
              <span className={cn(
                'absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1',
                'bg-tb-gradient text-white font-body font-bold text-[10px]',
                'rounded-full border-2 border-tb-base flex items-center justify-center leading-none',
              )}>
                {totalCount}
              </span>
            )}
          </button>

          <ProfileMenu />
        </div>
      </div>

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </header>
  );
}
