import { io, type Socket } from 'socket.io-client';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/hooks/queryKeys';
import type { Notification } from '@/types';
import { prependNotification, didInsert, type NotifCache } from './notificationCache';

const NOTIF_URL = (import.meta.env.VITE_WS_NOTIFICATION_URL as string | undefined) ?? 'http://localhost:3000';

type NotifSocket = Socket<{ notification: (n: Notification) => void }, Record<never, never>>;

let socket: NotifSocket | null = null;
let refCount = 0;

/**
 * Single app-scoped notification socket shared by every consumer
 * (Header bell + notifications page). Ref-counted: the connection opens on the
 * first consumer and closes when the last one unmounts, so there is never more
 * than one socket — preventing duplicate `notification` events from two sockets.
 *
 * @returns a release function for the caller's effect cleanup.
 */
export function acquireNotificationSocket(): () => void {
  refCount += 1;

  if (!socket) {
    // Backend serves notifications on the `/notifications` namespace of the
    // gateway origin (mirrors chat's `/chat`) — NOT the default namespace.
    socket = io(`${NOTIF_URL}/notifications`, { withCredentials: true });
    socket.on('notification', (incoming: Notification) => {
      const listKey = queryKeys.notifications.list(1);
      const before = queryClient.getQueryData<NotifCache>(listKey);
      const after = prependNotification(before, incoming);
      queryClient.setQueryData<NotifCache>(listKey, after);
      // Only bump the global unread badge when the notification was actually
      // inserted (prependNotification dedupes duplicate socket events).
      if (didInsert(before, after) && !incoming.isRead) {
        queryClient.setQueryData<{ unreadCount: number }>(
          queryKeys.notifications.unreadCount,
          (old) => ({ unreadCount: (old?.unreadCount ?? 0) + 1 }),
        );
      }
    });
  }

  return () => {
    refCount -= 1;
    if (refCount <= 0) {
      socket?.disconnect();
      socket = null;
      refCount = 0;
    }
  };
}
