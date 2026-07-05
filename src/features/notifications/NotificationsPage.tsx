import { useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOff } from 'lucide-react';
import { useNotifications } from './useNotifications';
import {
  getNotificationMeta,
  getNotificationContent,
  getNotificationHref,
  relativeTime,
} from './notificationDisplay';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/shared/Pagination';
import { cn } from '@/lib/format/utils';
import type { Notification } from '@/types';

function groupByDate(notifications: Notification[]): { label: string; items: Notification[] }[] {
  const now = Date.now();
  const DAY = 86400000;
  const groups: { label: string; items: Notification[] }[] = [
    { label: 'Hôm nay', items: [] },
    { label: 'Hôm qua', items: [] },
    { label: 'Tuần này', items: [] },
    { label: 'Cũ hơn', items: [] },
  ];
  for (const n of notifications) {
    const age = now - new Date(n.createdAt).getTime();
    if (age < DAY) {
      groups[0].items.push(n);
    } else if (age < 2 * DAY) {
      groups[1].items.push(n);
    } else if (age < 7 * DAY) {
      groups[2].items.push(n);
    } else {
      groups[3].items.push(n);
    }
  }
  return groups.filter((g) => g.items.length > 0);
}

type FilterKey = 'all' | 'unread';

export default function NotificationsPage(): ReactElement {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { notifications, unreadCount, totalPages, isLoading, markRead, markAllRead } = useNotifications(page);
  const [tab, setTab] = useState<FilterKey>('all');

  const list = tab === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;
  const groups = groupByDate(list);

  function handleClick(n: Notification): void {
    markRead(n.id);
    const href = getNotificationHref(n);
    if (href) {
      navigate(href);
    }
  }

  return (
    <div className="max-w-[640px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display font-black text-3xl uppercase tracking-tight text-ink-pri m-0">
          Thông báo
        </h1>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-accent-amber text-sm font-semibold bg-transparent border-0 cursor-pointer hover:underline p-0"
          >
            Đánh dấu đã đọc
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'unread'] as FilterKey[]).map((key) => {
          const label = key === 'all' ? 'Tất cả' : `Chưa đọc (${unreadCount})`;
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'px-4 py-2 rounded-full font-body font-semibold text-[13px] border cursor-pointer transition-colors',
                active
                  ? 'bg-tb-gradient text-ink-pri border-transparent'
                  : 'bg-canvas-elevated border-bdr text-ink-sec hover:border-accent-amber/50',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden flex flex-col">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3 px-4 py-3.5 border-b border-bdr last:border-0">
              <Skeleton className="w-10 h-10 rounded-full flex-none bg-canvas-elevated" />
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton className="h-4 w-3/4 bg-canvas-elevated rounded" />
                <Skeleton className="h-3 w-1/4 bg-canvas-elevated rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && list.length === 0 && (
        <div className="bg-canvas-surface border border-bdr rounded-tb-card py-16 flex flex-col items-center gap-3 text-center">
          <BellOff size={36} className="text-ink-muted" />
          <p className="font-body text-sm text-ink-sec m-0">
            {tab === 'unread' ? 'Bạn đã đọc tất cả thông báo!' : 'Không có thông báo'}
          </p>
        </div>
      )}

      {/* Grouped list */}
      {!isLoading && groups.length > 0 && (
        <div className="flex flex-col gap-4">
          {groups.map(({ label, items }) => (
            <div key={label}>
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5 px-1">
                {label}
              </div>
              <div className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden">
                {items.map((n) => {
                  const { Icon, color } = getNotificationMeta(n.type);
                  const { title, body } = getNotificationContent(n);
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleClick(n)}
                      className={cn(
                        'w-full text-left flex gap-3 px-4 py-3.5 border-b border-bdr/60 last:border-0',
                        'cursor-pointer transition-colors hover:bg-canvas-elevated',
                        !n.isRead && 'bg-accent-amber/[0.04]',
                      )}
                    >
                      <span className={cn('size-10 rounded-full flex-none grid place-items-center', color)}>
                        <Icon size={18} className="shrink-0" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'm-0 text-sm leading-snug font-semibold',
                          n.isRead ? 'text-ink-sec' : 'text-ink-pri',
                        )}>
                          {title}
                        </p>
                        <p className="m-0 text-sm leading-snug text-ink-sec">{body}</p>
                        <span className="text-xs text-ink-muted">{relativeTime(n.createdAt)}</span>
                      </div>
                      {!n.isRead && (
                        <span className="w-2.5 h-2.5 rounded-full bg-accent-amber flex-none mt-1.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          className="mt-6"
        />
      )}
    </div>
  );
}
