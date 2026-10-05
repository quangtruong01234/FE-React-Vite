import { useEffect } from 'react';
import { useQuery, useMutation, keepPreviousData } from '@tanstack/react-query';
import { queryClient } from '@/lib/query/queryClient';
import { queryKeys } from '@/hooks/query/queryKeys';
import { api } from '@/api';
import type { Notification } from '@/types';
import {
  markAllReadInCache, removeFromCache, type NotifCache,
} from './notificationCache';
import { acquireNotificationSocket } from './notificationSocket';

const PAGE_SIZE = 10;

type UnreadCache = { unreadCount: number };

/**
 * Neither `read-all` nor a delete emits a socket event (NOTIF-INBOX-01), so the
 * badge and every cached page — the other tab included — are refetched by hand.
 */
function refetchInbox(): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
}

export function useNotifications(page = 1, unreadOnly = false): {
  notifications: Notification[];
  unreadCount: number;
  totalPages: number;
  isLoading: boolean;
  isFetching: boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  isMarkingAllRead: boolean;
  remove: (id: string) => void;
} {
  const listKey = queryKeys.notifications.list(page, unreadOnly);

  const unreadKey = queryKeys.notifications.unreadCount;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: listKey,
    queryFn: () => api.notifications.getList(page, PAGE_SIZE, unreadOnly),
    // Keep the previous page rendered while the next one loads (no empty flash).
    placeholderData: keepPreviousData,
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
    mutationFn: (id: string) => api.notifications.markRead(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: unreadKey });
      const snapshot = queryClient.getQueryData<NotifCache>(listKey);
      const unreadSnapshot = queryClient.getQueryData<UnreadCache>(unreadKey);
      const wasUnread = snapshot?.data.some((n) => n.id === id && !n.isRead) ?? false;
      queryClient.setQueryData<NotifCache>(listKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        };
      });
      if (wasUnread) {
        queryClient.setQueryData<UnreadCache>(unreadKey, (old) =>
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
    // The other tab's cached page still shows this row as unread.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.lists }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
      queryClient.setQueriesData<NotifCache>(
        { queryKey: queryKeys.notifications.lists },
        markAllReadInCache,
      );
      queryClient.setQueryData<UnreadCache>(unreadKey, (old) => (old ? { unreadCount: 0 } : old));
    },
    onSettled: refetchInbox,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.notifications.remove(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
      const wasUnread = queryClient
        .getQueriesData<NotifCache>({ queryKey: queryKeys.notifications.lists })
        .some(([, cache]) => cache?.data.some((n) => n.id === id && !n.isRead) ?? false);
      queryClient.setQueriesData<NotifCache>(
        { queryKey: queryKeys.notifications.lists },
        (old) => removeFromCache(old, id),
      );
      if (wasUnread) {
        queryClient.setQueryData<UnreadCache>(unreadKey, (old) =>
          old ? { unreadCount: Math.max(0, old.unreadCount - 1) } : old,
        );
      }
    },
    // No snapshot rollback: the refetch puts back a row whose delete really
    // failed, while a 404 (already deleted elsewhere) stays removed. Pagination
    // also shifts by one row, so every cached page is refetched.
    onSettled: refetchInbox,
  });

  function markRead(id: string): void {
    markReadMutation.mutate(id);
  }

  function markAllRead(): void {
    markAllReadMutation.mutate();
  }

  function remove(id: string): void {
    removeMutation.mutate(id);
  }

  // Subscribe to the single app-scoped socket; ref-counted so multiple
  // consumers (bell + page) share one connection and never double-insert.
  useEffect(() => acquireNotificationSocket(), []);

  return {
    notifications,
    unreadCount,
    totalPages,
    isLoading,
    isFetching,
    markRead,
    markAllRead,
    isMarkingAllRead: markAllReadMutation.isPending,
    remove,
  };
}
