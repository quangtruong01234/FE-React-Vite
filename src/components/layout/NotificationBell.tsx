import { useRef, useState, useEffect, type ReactElement } from 'react';
import { Bell, CheckCircle, Truck, XCircle, MessageCircle, Heart, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications } from '@/features/notifications/useNotifications';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types';

const NOTI_ICON: Record<string, { icon: ReactElement; color: string }> = {
  payment_completed: { icon: <CheckCircle size={16} className="shrink-0" />, color: 'text-accent-green bg-accent-green/10' },
  order_shipped:     { icon: <Truck size={16} className="shrink-0" />,        color: 'text-accent-violet bg-accent-violet/10' },
  order_canceled:    { icon: <XCircle size={16} className="shrink-0" />,      color: 'text-accent-red bg-accent-red/10' },
  order_placed:      { icon: <ShoppingBag size={16} className="shrink-0" />,  color: 'text-accent-amber bg-accent-amber/10' },
  comment:           { icon: <MessageCircle size={16} className="shrink-0" />, color: 'text-accent-amber bg-accent-amber/10' },
  reply:             { icon: <Heart size={16} className="shrink-0" />,         color: 'text-accent-red bg-accent-red/10' },
};

function relativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return 'Vừa xong';
  if (diff < 60) return `${diff} phút trước`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

export function NotificationBell(): ReactElement {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markRead } = useNotifications();
  const preview = notifications.slice(0, 5);

  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleItemClick(n: Notification): void {
    markRead(n.id);
    setOpen(false);
    if (n.orderId) {
      navigate(`/order/${n.orderId}`);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Thông báo"
        className="relative bg-canvas-elevated border border-bdr text-ink-pri rounded-[10px] p-2.5 grid place-items-center cursor-pointer hover:border-accent-amber transition-colors"
      >
        <Bell size={16} className="shrink-0" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-tb-gradient text-ink-pri font-body font-bold text-[10px] rounded-full border-2 border-tb-base flex items-center justify-center leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-[360px] max-w-[90vw] bg-canvas-surface border border-bdr rounded-tb-card shadow-tb-card z-[120] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-bdr">
            <span className="font-display font-black uppercase tracking-wide text-ink-pri">Thông báo</span>
            {unreadCount > 0 && (
              <Link
                to="/notifications"
                onClick={() => setOpen(false)}
                className="text-accent-amber text-xs font-semibold hover:underline"
              >
                Đọc tất cả
              </Link>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {preview.length === 0 && (
              <div className="py-10 text-center text-ink-sec text-sm">Chưa có thông báo</div>
            )}
            {preview.map((n) => {
              const meta = NOTI_ICON[n.type] ?? {
                icon: <Bell size={16} className="shrink-0" />,
                color: 'text-ink-sec bg-canvas-elevated',
              };
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleItemClick(n)}
                  className={cn(
                    'w-full text-left flex gap-3 px-4 py-3 border-b border-bdr/60 last:border-0',
                    'cursor-pointer transition-colors hover:bg-canvas-elevated',
                    !n.isRead && 'bg-accent-amber/[0.04]',
                  )}
                >
                  <span className={cn('size-9 rounded-full flex-none grid place-items-center', meta.color)}>
                    {meta.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'm-0 text-[13px] leading-snug',
                      n.isRead ? 'text-ink-sec' : 'text-ink-pri font-medium',
                    )}>
                      {n.message}
                    </p>
                    <span className="text-[11px] text-ink-muted">{relativeTime(n.createdAt)}</span>
                  </div>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-accent-amber flex-none mt-1.5" />}
                </button>
              );
            })}
          </div>

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block text-center py-2.5 text-xs font-semibold text-accent-amber border-t border-bdr hover:bg-canvas-elevated transition-colors"
          >
            Xem tất cả thông báo
          </Link>
        </div>
      )}
    </div>
  );
}
