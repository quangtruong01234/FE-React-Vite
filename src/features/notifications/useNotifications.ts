import { useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/hooks/queryKeys';
import { api } from '@/api';
import type { Notification } from '@/types';
import type { NotifCache } from './notificationCache';
import { acquireNotificationSocket } from './notificationSocket';

const PAGE_SIZE = 10;

export function useNotifications(page = 1): {
  notifications: Notification[];
  unreadCount: number;
  totalPages: number;
  isLoading: boolean;
  markRead: (id: number) => void;
  markAllRead: () => void;
} {
  const listKey = queryKeys.notifications.list(page);

  const unreadKey = queryKeys.notifications.unreadCount;

  const { data, isLoading } = useQuery({
    queryKey: listKey,
    queryFn: () => api.notifications.getList(page, PAGE_SIZE),
  });

  const notifications = data?.data ?? [];
  const totalPages = data?.totalPages ?? 0;

  // Global-accurate unread count from a dedicated backend endpoint, so the badge
  // reflects every page — not just the notifications currently loaded.
  const { data: unreadData } = useQuery({
    queryKey: unreadKey,
    queryFn: () => api.notifications.getUnreadCount(),
  });
  const unreadCount = unreadData?.unreadCount ?? 0;

  const markReadMutation = useMutation({
    mutationFn: (id: number) => api.notifications.markRead(id),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: unreadKey });
      const snapshot = queryClient.getQueryData<NotifCache>(listKey);
      const unreadSnapshot = queryClient.getQueryData<{ unreadCount: number }>(unreadKey);
      const wasUnread = snapshot?.data.some((n) => n.id === id && !n.isRead) ?? false;
      queryClient.setQueryData<NotifCache>(listKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        };
      });
      if (wasUnread) {
        queryClient.setQueryData<{ unreadCount: number }>(unreadKey, (old) =>
          old ? { unreadCount: Math.max(0, old.unreadCount - 1) } : old,
        );
      }
      return { snapshot, unreadSnapshot };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot) {
        queryClient.setQueryData(listKey, ctx.snapshot);
      }
      if (ctx?.unreadSnapshot) {
        queryClient.setQueryData(unreadKey, ctx.unreadSnapshot);
      }
    },
  });

  function markRead(id: number): void {
    markReadMutation.mutate(id);
  }

  function markAllRead(): void {
    notifications.filter((n) => !n.isRead).forEach((n) => markReadMutation.mutate(n.id));
  }

  // Subscribe to the single app-scoped socket; ref-counted so multiple
  // consumers (bell + page) share one connection and never double-insert.
  useEffect(() => acquireNotificationSocket(), []);

  return { notifications, unreadCount, totalPages, isLoading, markRead, markAllRead };
}
