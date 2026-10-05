import type { Notification, PaginatedResponse } from '@/types';

export type NotifCache = PaginatedResponse<Notification>;

/**
 * Put a realtime notification at the top of the cached list.
 * A new `id` is prepended and bumps `total`. A known `id` replaces the cached
 * row and moves it to the top with `total` unchanged — aggregated rows
 * (SOCIAL-LIKE-NTF-01: one "like" row per post) are re-pushed with the SAME id
 * and a new message/actor/createdAt, and a duplicate socket event (or two
 * consumers) becomes a harmless replace. Returns undefined when there is no
 * cache yet.
 */
export function upsertNotification(
  cache: NotifCache | undefined,
  incoming: Notification,
): NotifCache | undefined {
  if (!cache) return cache;
  const rest = cache.data.filter((n) => n.id !== incoming.id);
  if (rest.length < cache.data.length) return { ...cache, data: [incoming, ...rest] };
  return { ...cache, data: [incoming, ...cache.data], total: cache.total + 1 };
}

/**
 * True when `upsertNotification` actually inserted a row (i.e. not a replace of
 * a known id). An empty/absent prior cache counts as an insert — the socket
 * delivered a new one.
 */
export function didInsert(
  before: NotifCache | undefined,
  after: NotifCache | undefined,
): boolean {
  if (!before) return true;
  return after?.total !== before.total;
}

export type UnreadBadgeUpdate = 'increment' | 'refetch' | 'none';

/**
 * How the global unread badge should react to a socket push.
 * - A "like" push may be an already-counted aggregated row that simply isn't on
 *   page 1 of the cache, so the client cannot tell new from re-pushed — refetch
 *   the real count instead of guessing.
 * - Otherwise +1 only when a row was genuinely inserted.
 */
export function unreadBadgeUpdate(
  before: NotifCache | undefined,
  after: NotifCache | undefined,
  incoming: Notification,
): UnreadBadgeUpdate {
  if (incoming.isRead) return 'none';
  if (incoming.type === 'like') return 'refetch';
  return didInsert(before, after) ? 'increment' : 'none';
}

/** Every cached row flipped to read — the optimistic face of `PATCH read-all` (NOTIF-INBOX-01). */
export function markAllReadInCache(cache: NotifCache | undefined): NotifCache | undefined {
  if (!cache) return cache;
  return { ...cache, data: cache.data.map((n) => (n.isRead ? n : { ...n, isRead: true })) };
}

/** Drops one row and decrements `total`; a cache without that id is returned unchanged. */
export function removeFromCache(cache: NotifCache | undefined, id: string): NotifCache | undefined {
  if (!cache) return cache;
  const data = cache.data.filter((n) => n.id !== id);
  if (data.length === cache.data.length) return cache;
  return { ...cache, data, total: Math.max(0, cache.total - 1) };
}
