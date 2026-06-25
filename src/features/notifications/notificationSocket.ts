import { io, type Socket } from 'socket.io-client';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/hooks/queryKeys';
import type { Notification } from '@/types';
import { prependNotification, type NotifCache } from './notificationCache';

const NOTIF_URL = (import.meta.env.VITE_WS_NOTIFICATION_URL as string | undefined) ?? 'http://localhost:3010';

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
    socket = io(NOTIF_URL, { withCredentials: true });
    socket.on('notification', (incoming: Notification) => {
      queryClient.setQueryData<NotifCache>(
        queryKeys.notifications.list(1),
        (old) => prependNotification(old, incoming),
      );
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
