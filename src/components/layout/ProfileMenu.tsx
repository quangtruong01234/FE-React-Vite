import { useRef, useState, useEffect, type ReactElement } from 'react';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/shared/Avatar';
import { useRole } from '@/hooks/auth/useRole';
import { useAuthContext } from '@/context/useAuthContext';
import { getAccountMenuItems, getRoleNavItems, type NavItem } from './navItems';

const ROW = 'w-full flex items-center gap-3 px-3 py-2 rounded-tb-input bg-transparent border-0 cursor-pointer hover:bg-canvas-elevated transition-colors text-left text-sm text-ink-pri';

export function ProfileMenu(): ReactElement {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const roleState = useRole();
  // Central logout (useAuth) clears the cache and broadcasts to other tabs —
  // don't replace with a local mutation, or other tabs keep the dead session.
  const { logout } = useAuthContext();

  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!roleState) return <div className="w-9 h-9 rounded-full bg-canvas-elevated animate-pulse" />;

  const { me, isSeller, isAdmin } = roleState;
  const accountItems = getAccountMenuItems(me);
  // Below `md` the LeftRail is hidden, so the dropdown stands in for it there.
  // Above `md` these rows are hidden — the rail already owns every one of them.
  const roleItems = getRoleNavItems({ isSeller, isAdmin });

  function go(to: string): void {
    setOpen(false);
    void navigate(to);
  }

  function renderRow(item: NavItem): ReactElement {
    return (
      <button key={item.to} onClick={() => go(item.to)} className={ROW}>
        <item.icon size={15} className="shrink-0 text-ink-sec" /> {item.label}
      </button>
    );
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
        <div className="absolute right-0 top-11 w-60 bg-canvas-surface border border-bdr rounded-tb-card shadow-tb-card z-[120] p-1.5 max-h-[calc(100vh-5rem)] overflow-y-auto">
          <div className="px-3 py-2.5 border-b border-bdr mb-1">
            <div className="text-sm font-semibold text-ink-pri truncate">{me.name ?? me.username}</div>
            <div className="text-xs text-ink-muted truncate">{me.email}</div>
          </div>

          {accountItems.map(renderRow)}

          {roleItems.length > 0 && (
            <div className="md:hidden">
              <div className="h-px bg-bdr my-1.5" />
              {roleItems.map(renderRow)}
            </div>
          )}

          <div className="h-px bg-bdr my-1.5" />
          <button
            onClick={() => logout({ onSuccess: () => void navigate('/login') })}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-tb-input bg-transparent border-0 cursor-pointer hover:bg-canvas-elevated transition-colors text-left text-sm text-ink-sec"
          >
            <LogOut size={15} className="shrink-0" /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
