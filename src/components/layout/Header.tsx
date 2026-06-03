import { useRef, useState, useEffect, type ReactElement } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, MessageSquare, ShoppingCart, PenLine, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GradientButton } from '@/components/shared/GradientButton';
import { useCart } from '@/context/CartContext';
import { useRole } from '@/hooks/useRole';
import { NotificationBell } from './NotificationBell';
import { ProfileMenu } from './ProfileMenu';

function CreateMenu(): ReactElement {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <GradientButton
        size="sm"
        className="rounded-full px-3.5 py-1.5 text-xs"
        onClick={() => setOpen(o => !o)}
      >
        <Plus size={13} /> Tạo
      </GradientButton>

      {open && (
        <div className="absolute right-0 top-10 w-52 bg-canvas-surface border border-bdr rounded-tb-card shadow-tb-card z-[120] p-1.5">
          <button
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] bg-transparent border-0 cursor-pointer hover:bg-canvas-elevated transition-colors text-left"
          >
            <span className="w-8 h-8 rounded-full bg-accent-amber/10 text-accent-amber flex items-center justify-center">
              <PenLine size={15} />
            </span>
            <div>
              <div className="text-sm font-semibold text-ink-pri">Bài viết</div>
              <div className="text-[11px] text-ink-muted">Chia sẻ lên feed</div>
            </div>
          </button>
          <button
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] bg-transparent border-0 cursor-pointer hover:bg-canvas-elevated transition-colors text-left"
          >
            <span className="w-8 h-8 rounded-full bg-accent-amber/10 text-accent-amber flex items-center justify-center">
              <Package size={15} />
            </span>
            <div>
              <div className="text-sm font-semibold text-ink-pri">Sản phẩm</div>
              <div className="text-[11px] text-ink-muted">Đăng bán mặt hàng</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

export function Header(): ReactElement {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') ?? '');
  const { totalCount, openCart } = useCart();
  const roleState = useRole();
  const isSeller = roleState?.isSeller ?? false;
  const isAdmin = roleState?.isAdmin ?? false;

  function handleSearchSubmit(e: React.FormEvent): void {
    e.preventDefault();
    void navigate(`/marketplace?search=${encodeURIComponent(searchQuery.trim())}`);
  }

  return (
    <header className="sticky top-0 z-[100] bg-canvas-surface/85 border-b border-bdr backdrop-blur-md">
      <div className="max-w-[1180px] mx-auto px-5 py-3 flex items-center gap-4">
        <Link to="/" className="flex-none">
          <span className="font-display font-black text-2xl tracking-tight uppercase text-ink-pri">
            Try<span className="bg-tb-gradient-90 bg-clip-text text-transparent">Buy</span>
          </span>
        </Link>

        <form
          onSubmit={handleSearchSubmit}
          className="relative flex-1 max-w-[440px] hidden sm:block"
        >
          <button
            type="submit"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 bg-transparent border-0 p-0 cursor-pointer"
          >
            <Search size={16} className="text-ink-muted pointer-events-none" />
          </button>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm sản phẩm, bài viết, seller…"
            className="w-full bg-canvas-elevated border border-bdr rounded-tb-input py-2.5 pl-10 pr-3.5 text-ink-pri font-body text-[13px] placeholder:text-ink-muted outline-none focus:border-accent-amber/50 transition-colors"
          />
        </form>

        <div className="flex items-center gap-2 ml-auto">
          {(isSeller || isAdmin) && <CreateMenu />}

          {/* Messages */}
          <Link
            to="/messages"
            aria-label="Tin nhắn"
            className="relative bg-canvas-elevated border border-bdr text-ink-pri rounded-[10px] w-9 h-9 flex items-center justify-center hover:border-accent-amber transition-colors"
          >
            <MessageSquare size={16} />
            {/* TODO Phase 6: wire useChat unreadCount */}
          </Link>

          <NotificationBell />

          {/* Cart */}
          <button
            onClick={openCart}
            aria-label="Giỏ hàng"
            className="relative bg-canvas-elevated border border-bdr text-ink-pri rounded-[10px] w-9 h-9 flex items-center justify-center cursor-pointer hover:border-accent-amber transition-colors"
          >
            <ShoppingCart size={16} color='white'/>
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
    </header>
  );
}
