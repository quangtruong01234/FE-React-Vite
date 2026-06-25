import type { Notification, PaginatedResponse } from '@/types';

export type NotifCache = PaginatedResponse<Notification>;

/**
 * Prepend a realtime notification to the cached list.
 * Dedupes by `id` so a duplicate socket event (or two consumers) cannot
 * insert the same notification twice. Returns the cache unchanged when the
 * notification already exists or when there is no cache yet.
 */
export function prependNotification(
  cache: NotifCache | undefined,
  incoming: Notification,
): NotifCache | undefined {
  if (!cache) return cache;
  if (cache.data.some((n) => n.id === incoming.id)) return cache;
  return { ...cache, data: [incoming, ...cache.data], total: cache.total + 1 };
}
