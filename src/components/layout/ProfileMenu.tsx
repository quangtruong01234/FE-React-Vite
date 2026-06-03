import { useRef, useState, useEffect, type ReactElement } from 'react';
import { User, Package, Store, LayoutDashboard, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/shared/Avatar';
import { useRole } from '@/hooks/useRole';
import { api } from '@/api';

export function ProfileMenu(): ReactElement {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const roleState = useRole();

  const { mutate: logout } = useMutation({
    mutationFn: () => api.auth.logout(),
    onSuccess: () => {
      void navigate('/login');
    },
  });

  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!roleState) return <div className="w-9 h-9 rounded-full bg-canvas-elevated animate-pulse" />;

  const { me, isSeller, isAdmin } = roleState;

  function go(to: string): void {
    setOpen(false);
    void navigate(to);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="bg-transparent border-0 p-0 cursor-pointer rounded-full"
        aria-label="Menu tài khoản"
      >
        <Avatar src={me.avatar ?? undefined} alt={me.username} size={36} />
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-60 bg-canvas-surface border border-bdr rounded-tb-card shadow-tb-card z-[120] p-1.5">
          <div className="px-3 py-2.5 border-b border-bdr mb-1">
            <div className="text-sm font-semibold text-ink-pri truncate">{me.name ?? me.username}</div>
            <div className="text-xs text-ink-muted truncate">{me.email}</div>
          </div>

          <button
            onClick={() => go(`/profile/${me.id}`)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-[10px] bg-transparent border-0 cursor-pointer hover:bg-canvas-elevated transition-colors text-left text-sm text-ink-pri"
          >
            <User size={15} className="text-ink-sec" /> Trang cá nhân
          </button>
          <button
            onClick={() => go('/orders')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-[10px] bg-transparent border-0 cursor-pointer hover:bg-canvas-elevated transition-colors text-left text-sm text-ink-pri"
          >
            <Package size={15} className="text-ink-sec" /> Đơn hàng
          </button>
          {(isSeller || isAdmin) && (
            <button
              onClick={() => go('/shop')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-[10px] bg-transparent border-0 cursor-pointer hover:bg-canvas-elevated transition-colors text-left text-sm text-ink-pri"
            >
              <Store size={15} className="text-ink-sec" /> Kênh người bán
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => go('/admin')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-[10px] bg-transparent border-0 cursor-pointer hover:bg-canvas-elevated transition-colors text-left text-sm text-ink-pri"
            >
              <LayoutDashboard size={15} className="text-ink-sec" /> Quản trị sàn
            </button>
          )}

          <div className="h-px bg-bdr my-1.5" />
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-[10px] bg-transparent border-0 cursor-pointer hover:bg-canvas-elevated transition-colors text-left text-sm text-ink-sec"
          >
            <LogOut size={15} /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
