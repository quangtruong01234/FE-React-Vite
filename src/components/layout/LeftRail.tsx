import { type ReactElement } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Store, LayoutDashboard, PlusCircle, Tag, Layers, ClipboardList, Flag, BarChart3, MapPin,
} from 'lucide-react';
import { cn } from '@/lib/format/utils';
import { Avatar } from '@/components/shared/Avatar';
import { useRole } from '@/hooks/auth/useRole';
import { getPrimaryNavItems } from './navItems';

export function LeftRail({ fullHeight }: { fullHeight?: boolean } = {}): ReactElement {
  const location = useLocation();
  const roleState = useRole();

  const me = roleState?.me;
  const isSeller = roleState?.isSeller ?? false;
  const isAdmin = roleState?.isAdmin ?? false;

  const cur = '/' + (location.pathname.replace(/^\//, '').split('/')[0] ?? '');

  const navItems = getPrimaryNavItems(me);

  function isActive(to: string): boolean {
    if (to === '/') return location.pathname === '/';
    return cur === to || location.pathname.startsWith(to);
  }

  return (
    <aside className={cn('hidden md:flex flex-col gap-1', fullHeight ? 'h-full overflow-y-auto pb-6' : 'sticky top-[76px] self-start pb-20')}>
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
              'size-8 rounded-full flex-none grid place-items-center',
              active ? 'bg-tb-gradient text-white' : 'bg-canvas-elevated text-accent-amber',
            )}>
              <item.icon size={16} className="shrink-0" />
            </span>
            <span className={cn(
              'flex-1 font-body text-sm',
              active ? 'text-ink-pri font-semibold' : 'text-ink-pri font-medium',
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}

      {me && (
        <Link
          to="/addresses"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-[10px] cursor-pointer transition-colors w-full',
            isActive('/addresses') ? 'bg-canvas-elevated' : 'hover:bg-canvas-elevated',
          )}
        >
          <span className={cn(
            'size-8 rounded-full flex-none grid place-items-center',
            isActive('/addresses') ? 'bg-tb-gradient text-white' : 'bg-canvas-elevated text-accent-amber',
          )}>
            <MapPin size={16} className="shrink-0" />
          </span>
          <span className={cn(
            'flex-1 font-body text-sm',
            isActive('/addresses') ? 'text-ink-pri font-semibold' : 'text-ink-pri font-medium',
          )}>
            Sổ địa chỉ
          </span>
        </Link>
      )}

      {isSeller && (
        <>
          <div className="h-px bg-bdr mx-3 my-2.5" />
          <Link
            to="/shop"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-[10px] cursor-pointer transition-colors',
              isActive('/shop') && !location.pathname.startsWith('/shop/analytics') ? 'bg-canvas-elevated' : 'hover:bg-canvas-elevated',
            )}
          >
            <span className="size-8 rounded-full bg-accent-amber/10 text-accent-amber flex-none grid place-items-center">
              <Store size={16} className="shrink-0" />
            </span>
            <span className="flex-1 font-body font-semibold text-sm text-ink-pri">Kênh người bán</span>
          </Link>
          <Link
            to="/sell"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-[10px] cursor-pointer transition-colors',
              isActive('/sell') && !location.pathname.startsWith('/sell/orders') ? 'bg-canvas-elevated' : 'hover:bg-canvas-elevated',
            )}
          >
            <span className="size-8 rounded-full bg-accent-amber/10 text-accent-amber flex-none grid place-items-center">
              <PlusCircle size={16} className="shrink-0" />
            </span>
            <span className="flex-1 font-body font-semibold text-sm text-ink-pri">Đăng sản phẩm</span>
          </Link>
          <Link
            to="/sell/orders"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-[10px] cursor-pointer transition-colors',
              isActive('/sell/orders') ? 'bg-canvas-elevated' : 'hover:bg-canvas-elevated',
            )}
          >
            <span className="size-8 rounded-full bg-accent-amber/10 text-accent-amber flex-none grid place-items-center">
              <ClipboardList size={16} className="shrink-0" />
            </span>
            <span className="flex-1 font-body font-semibold text-sm text-ink-pri">Đơn bán</span>
          </Link>
          <Link
            to="/shop/analytics"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-[10px] cursor-pointer transition-colors',
              isActive('/shop/analytics') ? 'bg-canvas-elevated' : 'hover:bg-canvas-elevated',
            )}
          >
            <span className="size-8 rounded-full bg-accent-amber/10 text-accent-amber flex-none grid place-items-center">
              <BarChart3 size={16} className="shrink-0" />
            </span>
            <span className="flex-1 font-body font-semibold text-sm text-ink-pri">Thống kê bán hàng</span>
          </Link>
        </>
      )}

      {isAdmin && (
        <>
          <div className="h-px bg-bdr mx-3 my-2.5" />
          <Link
            to="/admin"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-[10px] cursor-pointer transition-colors',
              location.pathname === '/admin' ? 'bg-canvas-elevated' : 'hover:bg-canvas-elevated',
            )}
          >
            <span className="size-8 rounded-full bg-accent-amber/10 text-accent-amber flex-none grid place-items-center">
              <LayoutDashboard size={16} className="shrink-0" />
            </span>
            <span className="flex-1 font-body font-semibold text-sm text-ink-pri">Quản trị sàn</span>
          </Link>
          <Link
            to="/admin/brands/pending"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-[10px] cursor-pointer transition-colors',
              isActive('/admin/brands/pending') ? 'bg-canvas-elevated' : 'hover:bg-canvas-elevated',
            )}
          >
            <span className="size-8 rounded-full bg-accent-amber/10 text-accent-amber flex-none grid place-items-center">
              <Tag size={16} className="shrink-0" />
            </span>
            <span className="flex-1 font-body font-semibold text-sm text-ink-pri">Duyệt thương hiệu</span>
          </Link>
          <Link
            to="/admin/categories/pending"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-[10px] cursor-pointer transition-colors',
              isActive('/admin/categories/pending') ? 'bg-canvas-elevated' : 'hover:bg-canvas-elevated',
            )}
          >
            <span className="size-8 rounded-full bg-accent-amber/10 text-accent-amber flex-none grid place-items-center">
              <Layers size={16} className="shrink-0" />
            </span>
            <span className="flex-1 font-body font-semibold text-sm text-ink-pri">Duyệt danh mục</span>
          </Link>
          <Link
            to="/admin/reports"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-[10px] cursor-pointer transition-colors',
              isActive('/admin/reports') ? 'bg-canvas-elevated' : 'hover:bg-canvas-elevated',
            )}
          >
            <span className="size-8 rounded-full bg-accent-amber/10 text-accent-amber flex-none grid place-items-center">
              <Flag size={16} className="shrink-0" />
            </span>
            <span className="flex-1 font-body font-semibold text-sm text-ink-pri">Kiểm duyệt bài viết</span>
          </Link>
          <Link
            to="/admin/analytics"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-[10px] cursor-pointer transition-colors',
              isActive('/admin/analytics') ? 'bg-canvas-elevated' : 'hover:bg-canvas-elevated',
            )}
          >
            <span className="size-8 rounded-full bg-accent-amber/10 text-accent-amber flex-none grid place-items-center">
              <BarChart3 size={16} className="shrink-0" />
            </span>
            <span className="flex-1 font-body font-semibold text-sm text-ink-pri">Thống kê toàn sàn</span>
          </Link>
        </>
      )}
    </aside>
  );
}
