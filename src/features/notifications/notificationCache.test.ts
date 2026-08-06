import { describe, it, expect } from 'vitest';
import type { Notification } from '@/types';
import { prependNotification, didInsert, type NotifCache } from './notificationCache';

function notif(id: number, partial: Partial<Notification> = {}): Notification {
  return {
    id: `ntf_${id}`,
    userId: 'usr_1',
    type: 'order_placed',
    orderId: null,
    postId: null,
    actorId: null,
    preview: null,
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
    expect(result?.data.map((n) => n.id)).toEqual(['ntf_2', 'ntf_1']);
    expect(result?.total).toBe(2);
  });

  it('dedupes by id so a duplicate socket event is ignored', () => {
    const start = cache(notif(1), notif(2));
    const result = prependNotification(start, notif(1));
    expect(result?.data.map((n) => n.id)).toEqual(['ntf_1', 'ntf_2']);
    expect(result?.total).toBe(2);
    expect(result).toBe(start);
  });

  it('inserts into an empty cache', () => {
    const result = prependNotification(cache(), notif(5));
    expect(result?.data.map((n) => n.id)).toEqual(['ntf_5']);
    expect(result?.total).toBe(1);
  });

  it('returns the cache unchanged when there is no cache yet', () => {
    expect(prependNotification(undefined, notif(1))).toBeUndefined();
  });
});

describe('didInsert', () => {
  it('is true when a new notification was prepended (total grew)', () => {
    const before = cache(notif(1));
    const after = prependNotification(before, notif(2));
    expect(didInsert(before, after)).toBe(true);
  });

  it('is false when the event was a deduped duplicate (total unchanged)', () => {
    const before = cache(notif(1), notif(2));
    const after = prependNotification(before, notif(1));
    expect(didInsert(before, after)).toBe(false);
  });

  it('is true when there was no prior cache (a genuinely new event arrived)', () => {
    expect(didInsert(undefined, undefined)).toBe(true);
  });
});
