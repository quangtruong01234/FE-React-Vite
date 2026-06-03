import { type ReactElement } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, Store, MessageSquare, Bell, Package,
  User, ShoppingCart, LayoutDashboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/shared/Avatar';
import { useCart } from '@/context/CartContext';
import { useRole } from '@/hooks/useRole';

export function LeftRail(): ReactElement {
  const location = useLocation();
  const { totalCount, openCart } = useCart();
  const roleState = useRole();

  const me = roleState?.me;
  const isSeller = roleState?.isSeller ?? false;
  const isAdmin = roleState?.isAdmin ?? false;

  const cur = '/' + (location.pathname.replace(/^\//, '').split('/')[0] ?? '');

  const navItems = [
    { icon: Home,         label: 'Bảng tin',       to: '/' },
    { icon: Store,        label: 'Chợ sản phẩm',   to: '/marketplace' },
    { icon: Bell,         label: 'Thông báo',       to: '/notifications', bullet: 0 },
    { icon: Package,      label: 'Đơn hàng',        to: '/orders' },
    ...(me ? [{ icon: User, label: 'Trang cá nhân', to: `/profile/${me.id}` }] : []),
  ] as const;

  function isActive(to: string): boolean {
    if (to === '/') return location.pathname === '/';
    return cur === to || location.pathname.startsWith(to);
  }

  return (
    <aside className="sticky top-[76px] self-start hidden md:flex flex-col gap-1 pb-20">
      {me && (
        <Link
          to={`/profile/${me.id}`}
          className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] hover:bg-canvas-elevated transition-colors mb-1"
        >
          <Avatar src={me.avatar ?? undefined} alt={me.username} size={38} />
          <div className="min-w-0">
            <div className="font-body font-semibold text-sm text-ink-pri truncate">{me.name ?? me.username}</div>
            <div className="text-xs text-ink-muted truncate">
              {isAdmin ? 'Quản trị sàn' : isSeller ? 'Người bán' : `@${me.username}`}
            </div>
          </div>
        </Link>
      )}

      {navItems.map(item => {
        const active = isActive(item.to);
        return (
          <Link
            key={item.label}
            to={item.to}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-[10px] cursor-pointer transition-colors w-full',
              active ? 'bg-canvas-elevated' : 'hover:bg-canvas-elevated',
            )}
          >
            <span className={cn(
              'w-8 h-8 rounded-full flex-none inline-flex items-center justify-center',
              active ? 'bg-tb-gradient text-white' : 'bg-canvas-elevated text-accent-amber',
            )}>
              <item.icon size={16} />
            </span>
            <span className={cn(
              'flex-1 font-body text-sm',
              active ? 'text-ink-pri font-semibold' : 'text-ink-pri font-medium',
            )}>
              {item.label}
            </span>
            {'bullet' in item && (item as { bullet: number }).bullet > 0 && (
              <span className="min-w-[22px] h-[22px] px-1.5 bg-tb-gradient text-white font-bold text-[11px] rounded-full inline-flex items-center justify-center">
                {(item as { bullet: number }).bullet}
              </span>
            )}
          </Link>
        );
      })}

      {/* Cart — opens sidebar, not a route */}
      <button
        onClick={openCart}
        className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] bg-transparent border-0 cursor-pointer hover:bg-canvas-elevated transition-colors w-full text-left"
      >
        <span className="w-8 h-8 rounded-full bg-canvas-elevated text-accent-amber flex-none inline-flex items-center justify-center">
          <ShoppingCart size={16} />
        </span>
        <span className="flex-1 font-body font-medium text-sm text-ink-pri">Giỏ hàng</span>
        {totalCount > 0 && (
          <span className="min-w-[22px] h-[22px] px-1.5 bg-tb-gradient text-white font-bold text-[11px] rounded-full inline-flex items-center justify-center">
            {totalCount}
          </span>
        )}
      </button>

      {(isSeller || isAdmin) && (
        <>
          <div className="h-px bg-bdr mx-3 my-2.5" />
          <Link
            to="/shop"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-[10px] cursor-pointer transition-colors',
              isActive('/shop') ? 'bg-canvas-elevated' : 'hover:bg-canvas-elevated',
            )}
          >
            <span className="w-8 h-8 rounded-full bg-accent-amber/10 text-accent-amber flex-none inline-flex items-center justify-center">
              <Store size={16} />
            </span>
            <span className="flex-1 font-body font-semibold text-sm text-ink-pri">Kênh người bán</span>
          </Link>
        </>
      )}

      {isAdmin && (
        <Link
          to="/admin"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-[10px] cursor-pointer transition-colors',
            isActive('/admin') ? 'bg-canvas-elevated' : 'hover:bg-canvas-elevated',
          )}
        >
          <span className="w-8 h-8 rounded-full bg-accent-amber/10 text-accent-amber flex-none inline-flex items-center justify-center">
            <LayoutDashboard size={16} />
          </span>
          <span className="flex-1 font-body font-semibold text-sm text-ink-pri">Quản trị sàn</span>
        </Link>
      )}
    </aside>
  );
}
