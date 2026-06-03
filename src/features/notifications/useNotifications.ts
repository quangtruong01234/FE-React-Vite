import { useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/hooks/queryKeys';
import { api } from '@/api';
import type { Notification, PaginatedResponse } from '@/types';

const NOTIF_URL = (import.meta.env.VITE_WS_NOTIFICATION_URL as string | undefined) ?? 'http://localhost:3010';

type NotifCache = PaginatedResponse<Notification>;
type NotifSocket = Socket<{ notification: (n: Notification) => void }, Record<never, never>>;

export function useNotifications(): {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markRead: (id: number) => void;
  markAllRead: () => void;
} {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.notifications.list(1),
    queryFn: () => api.notifications.getList(1, 50),
  });

  const notifications = data?.data ?? [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markReadMutation = useMutation({
    mutationFn: (id: number) => api.notifications.markRead(id),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.list(1) });
      const snapshot = queryClient.getQueryData<NotifCache>(queryKeys.notifications.list(1));
      queryClient.setQueryData<NotifCache>(queryKeys.notifications.list(1), (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
        };
      });
      return { snapshot };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot) {
        queryClient.setQueryData(queryKeys.notifications.list(1), ctx.snapshot);
      }
    },
  });

  function markRead(id: number): void {
    markReadMutation.mutate(id);
  }

  function markAllRead(): void {
    notifications.filter((n) => !n.is_read).forEach((n) => markReadMutation.mutate(n.id));
  }

  const socketRef = useRef<NotifSocket | null>(null);

  useEffect(() => {
    const socket: NotifSocket = io(NOTIF_URL, { withCredentials: true });
    socketRef.current = socket;

    socket.on('notification', (newNotif: Notification) => {
      queryClient.setQueryData<NotifCache>(queryKeys.notifications.list(1), (old) => {
        if (!old) return old;
        return { ...old, data: [newNotif, ...old.data], total: old.total + 1 };
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return { notifications, unreadCount, isLoading, markRead, markAllRead };
}
