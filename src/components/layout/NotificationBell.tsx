import { useRef, useState, useEffect, type ReactElement } from 'react';
import { Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications } from '@/features/notifications/useNotifications';
import {
  getNotificationMeta,
  getNotificationContent,
  getNotificationHref,
  relativeTime,
} from '@/features/notifications/notificationDisplay';
import { cn } from '@/lib/format/utils';
import type { Notification } from '@/types';

export function NotificationBell(): ReactElement {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
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
    const href = getNotificationHref(n);
    if (href) {
      navigate(href);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Thông báo"
        className="relative bg-canvas-elevated border border-bdr text-ink-pri rounded-tb-input p-2.5 grid place-items-center cursor-pointer hover:border-accent-amber transition-colors"
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
            {/* Marks the loaded notifications read in place — the footer link is the
                only way out of this dropdown, so the two never lead to the same page. */}
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="bg-transparent border-0 p-0 cursor-pointer text-accent-amber text-xs font-semibold hover:underline"
              >
                Đọc tất cả
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {preview.length === 0 && (
              <div className="py-10 text-center text-ink-sec text-sm">Chưa có thông báo</div>
            )}
            {preview.map((n) => {
              const { Icon, color } = getNotificationMeta(n.type);
              const { title, body } = getNotificationContent(n);
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
                  <span className={cn('size-9 rounded-full flex-none grid place-items-center', color)}>
                    <Icon size={16} className="shrink-0" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'm-0 text-[13px] leading-snug font-semibold',
                      n.isRead ? 'text-ink-sec' : 'text-ink-pri',
                    )}>
                      {title}
                    </p>
                    <p className="m-0 text-[13px] leading-snug text-ink-sec">{body}</p>
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
