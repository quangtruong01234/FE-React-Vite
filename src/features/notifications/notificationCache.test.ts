import { describe, it, expect } from 'vitest';
import type { Notification } from '@/types';
import { prependNotification, type NotifCache } from './notificationCache';

function notif(id: number, partial: Partial<Notification> = {}): Notification {
  return {
    id,
    userId: 1,
    type: 'order_placed',
    orderId: null,
    message: `Notification ${id}`,
    isRead: false,
    createdAt: '2026-06-24T00:00:00.000Z',
    ...partial,
  };
}

function cache(...items: Notification[]): NotifCache {
  return { data: items, total: items.length, page: 1, limit: 50, totalPages: 1, hasNext: false };
}

describe('prependNotification', () => {
  it('prepends a new notification and bumps total', () => {
    const result = prependNotification(cache(notif(1)), notif(2));
    expect(result?.data.map((n) => n.id)).toEqual([2, 1]);
    expect(result?.total).toBe(2);
  });

  it('dedupes by id so a duplicate socket event is ignored', () => {
    const start = cache(notif(1), notif(2));
    const result = prependNotification(start, notif(1));
    expect(result?.data.map((n) => n.id)).toEqual([1, 2]);
    expect(result?.total).toBe(2);
    expect(result).toBe(start);
  });

  it('inserts into an empty cache', () => {
    const result = prependNotification(cache(), notif(5));
    expect(result?.data.map((n) => n.id)).toEqual([5]);
    expect(result?.total).toBe(1);
  });

  it('returns the cache unchanged when there is no cache yet', () => {
    expect(prependNotification(undefined, notif(1))).toBeUndefined();
  });
});
