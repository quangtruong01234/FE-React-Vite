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

  const { data, isLoading } = useQuery({
    queryKey: listKey,
    queryFn: () => api.notifications.getList(page, PAGE_SIZE),
  });

  const notifications = data?.data ?? [];
  const totalPages = data?.totalPages ?? 0;
  // Unread count is derived from the loaded page only; a global badge needs a
  // dedicated backend unread-count endpoint (see snapshot handoff).
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markReadMutation = useMutation({
    mutationFn: (id: number) => api.notifications.markRead(id),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const snapshot = queryClient.getQueryData<NotifCache>(listKey);
      queryClient.setQueryData<NotifCache>(listKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        };
      });
      return { snapshot };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot) {
        queryClient.setQueryData(listKey, ctx.snapshot);
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
