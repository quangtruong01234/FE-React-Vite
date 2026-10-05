import { describe, it, expect } from 'vitest';
import type { Notification } from '@/types';
import {
  upsertNotification, didInsert, unreadBadgeUpdate, markAllReadInCache, removeFromCache,
  type NotifCache,
} from './notificationCache';

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

describe('upsertNotification', () => {
  it('prepends a new notification and bumps total', () => {
    const result = upsertNotification(cache(notif(1)), notif(2));
    expect(result?.data.map((n) => n.id)).toEqual(['ntf_2', 'ntf_1']);
    expect(result?.total).toBe(2);
  });

  it('does not duplicate a repeated socket event — total stays put', () => {
    const result = upsertNotification(cache(notif(1), notif(2)), notif(1));
    expect(result?.data.map((n) => n.id)).toEqual(['ntf_1', 'ntf_2']);
    expect(result?.total).toBe(2);
  });

  it('replaces a re-pushed aggregated row and moves it to the top (SOCIAL-LIKE-NTF-01)', () => {
    const like = notif(1, { type: 'like', message: 'Someone liked your post' });
    const bumped = notif(1, {
      type: 'like', message: '3 people liked your post', createdAt: '2026-06-25T00:00:00.000Z',
    });
    const result = upsertNotification(cache(notif(3), like, notif(2)), bumped);
    expect(result?.data.map((n) => n.id)).toEqual(['ntf_1', 'ntf_3', 'ntf_2']);
    expect(result?.data[0]).toBe(bumped);
    expect(result?.total).toBe(3);
  });

  it('inserts into an empty cache', () => {
    const result = upsertNotification(cache(), notif(5));
    expect(result?.data.map((n) => n.id)).toEqual(['ntf_5']);
    expect(result?.total).toBe(1);
  });

  it('returns the cache unchanged when there is no cache yet', () => {
    expect(upsertNotification(undefined, notif(1))).toBeUndefined();
  });
});

describe('didInsert', () => {
  it('is true when a new notification was prepended (total grew)', () => {
    const before = cache(notif(1));
    const after = upsertNotification(before, notif(2));
    expect(didInsert(before, after)).toBe(true);
  });

  it('is false when the event replaced a known id (total unchanged)', () => {
    const before = cache(notif(1), notif(2));
    const after = upsertNotification(before, notif(1));
    expect(didInsert(before, after)).toBe(false);
  });

  it('is true when there was no prior cache (a genuinely new event arrived)', () => {
    expect(didInsert(undefined, undefined)).toBe(true);
  });
});

describe('unreadBadgeUpdate', () => {
  it('increments for a genuinely new unread row', () => {
    const before = cache(notif(1));
    const incoming = notif(2);
    expect(unreadBadgeUpdate(before, upsertNotification(before, incoming), incoming)).toBe('increment');
  });

  it('increments when there is no list cache yet', () => {
    expect(unreadBadgeUpdate(undefined, undefined, notif(2))).toBe('increment');
  });

  it('leaves the badge alone for a repeated event or a read row', () => {
    const before = cache(notif(1));
    const repeat = notif(1);
    expect(unreadBadgeUpdate(before, upsertNotification(before, repeat), repeat)).toBe('none');
    const read = notif(2, { isRead: true });
    expect(unreadBadgeUpdate(before, upsertNotification(before, read), read)).toBe('none');
  });

  it('refetches the count for a like — a re-pushed aggregated row may sit off page 1', () => {
    const before = cache(notif(1));
    const like = notif(9, { type: 'like', message: '2 people liked your post' });
    // Not in the cache → looks like an insert, but the row may already be counted.
    expect(unreadBadgeUpdate(before, upsertNotification(before, like), like)).toBe('refetch');
    expect(unreadBadgeUpdate(undefined, undefined, like)).toBe('refetch');
  });

  it('never touches the badge for a like that is already read', () => {
    const like = notif(9, { type: 'like', isRead: true });
    expect(unreadBadgeUpdate(cache(), upsertNotification(cache(), like), like)).toBe('none');
  });
});

describe('markAllReadInCache (NOTIF-INBOX-01)', () => {
  it('flips every row to read and keeps the pagination fields', () => {
    const result = markAllReadInCache(cache(notif(1), notif(2, { isRead: true })));
    expect(result?.data.every((n) => n.isRead)).toBe(true);
    expect(result?.total).toBe(2);
  });

  it('leaves an absent cache absent', () => {
    expect(markAllReadInCache(undefined)).toBeUndefined();
  });
});

describe('removeFromCache (NOTIF-INBOX-01)', () => {
  it('drops the row and decrements total', () => {
    const result = removeFromCache(cache(notif(1), notif(2)), 'ntf_1');
    expect(result?.data.map((n) => n.id)).toEqual(['ntf_2']);
    expect(result?.total).toBe(1);
  });

  it('returns the same cache when the id is not on this page', () => {
    const before = cache(notif(1));
    expect(removeFromCache(before, 'ntf_9')).toBe(before);
  });

  it('leaves an absent cache absent', () => {
    expect(removeFromCache(undefined, 'ntf_1')).toBeUndefined();
  });
});
