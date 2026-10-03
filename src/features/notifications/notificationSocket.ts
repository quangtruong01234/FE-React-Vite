import type { Socket } from 'socket.io-client';
import { queryClient } from '@/lib/query/queryClient';
import { queryKeys } from '@/hooks/query/queryKeys';
import { createRefCountedSocket } from '@/lib/realtime/socket';
import { resolveSocketUrl } from '@/lib/realtime/socketUrl';
import type { Notification } from '@/types';
import { upsertNotification, unreadBadgeUpdate, type NotifCache } from './notificationCache';

const NOTIF_SOCKET_URL = resolveSocketUrl(
  import.meta.env.VITE_WS_NOTIFICATION_URL as string | undefined,
  '/notifications',
);

type NotifSocket = Socket<{ notification: (n: Notification) => void }, Record<never, never>>;

// Backend serves notifications on the `/notifications` namespace (mirrors chat's
// `/chat`) — NOT the default namespace. Shared by every consumer (Header bell +
// notifications page) via the ref-counted lifecycle in `lib/socket`.
const notificationSocket = createRefCountedSocket<NotifSocket>(NOTIF_SOCKET_URL, {
  onCreate: (socket) => {
    socket.on('notification', (incoming: Notification) => {
      const listKey = queryKeys.notifications.list(1);
      const before = queryClient.getQueryData<NotifCache>(listKey);
      const after = upsertNotification(before, incoming);
      queryClient.setQueryData<NotifCache>(listKey, after);
      const badge = unreadBadgeUpdate(before, after, incoming);
      if (badge === 'increment') {
        queryClient.setQueryData<{ unreadCount: number }>(
          queryKeys.notifications.unreadCount,
          (old) => ({ unreadCount: (old?.unreadCount ?? 0) + 1 }),
        );
      } else if (badge === 'refetch') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
      }
    });
  },
});

/** @returns a release function for the caller's effect cleanup. */
export function acquireNotificationSocket(): () => void {
  return notificationSocket.acquire();
}
