import { describe, it, expect } from 'vitest';
import type { Message, PaginatedResponse } from '@/types';
import {
  appendMessageToCache, mergeMessages, resolvePendingMessage, markPendingAsError,
  type ChatMessage, type MessagesInfiniteData,
} from './chatMessages';

function msg(id: number, partial: Partial<Message> = {}): Message {
  return {
    id,
    conversationId: 1,
    senderId: 2,
    content: `m${id}`,
    parentMessageId: null,
    createdAt: '2026-06-26T10:00:00.000Z',
    ...partial,
  };
}

function page(data: Message[], partial: Partial<PaginatedResponse<Message>> = {}): PaginatedResponse<Message> {
  return { data, total: data.length, page: 1, limit: 10, totalPages: 1, hasNext: false, ...partial };
}

function cache(pages: PaginatedResponse<Message>[]): MessagesInfiniteData {
  return { pages, pageParams: pages.map((_, i) => i + 1) };
}

describe('appendMessageToCache', () => {
  it('no-ops when the cache has not loaded yet', () => {
    expect(appendMessageToCache(undefined, msg(1))).toBeUndefined();
  });

  it('no-ops when there are no pages', () => {
    const empty = cache([]);
    expect(appendMessageToCache(empty, msg(1))).toBe(empty);
  });

  it('prepends the message to page 0 (newest-first) and bumps total', () => {
    const before = cache([page([msg(3), msg(2)]), page([msg(1)])]);
    const after = appendMessageToCache(before, msg(4));
    expect(after?.pages[0].data.map((m) => m.id)).toEqual([4, 3, 2]);
    expect(after?.pages[0].total).toBe(3);
    // older page untouched
    expect(after?.pages[1].data.map((m) => m.id)).toEqual([1]);
  });

  it('dedupes an id already present in any page (own send echo / re-delivery)', () => {
    const before = cache([page([msg(2)]), page([msg(1)])]);
    expect(appendMessageToCache(before, msg(1))).toBe(before);
    expect(appendMessageToCache(before, msg(2))).toBe(before);
  });

  it('does not mutate the input', () => {
    const before = cache([page([msg(2)])]);
    appendMessageToCache(before, msg(3));
    expect(before.pages[0].data.map((m) => m.id)).toEqual([2]);
  });
});

describe('mergeMessages', () => {
  it('returns http as-is when there are no socket messages', () => {
    const http = [msg(1), msg(2)];
    expect(mergeMessages(http, [])).toBe(http);
  });

  it('appends socket arrivals the history does not contain, in arrival order', () => {
    const merged = mergeMessages([msg(1), msg(2)], [msg(3), msg(4)]);
    expect(merged.map((m) => m.id)).toEqual([1, 2, 3, 4]);
  });

  it('dedupes socket messages already in the history (post-refetch overlap)', () => {
    const merged = mergeMessages([msg(1), msg(2)], [msg(2), msg(3)]);
    expect(merged.map((m) => m.id)).toEqual([1, 2, 3]);
  });
});

describe('resolvePendingMessage', () => {
  const pending = (id: number, content: string, status: ChatMessage['status']): ChatMessage =>
    ({ ...msg(id, { content }), status });

  it('removes only the first sending entry matching the confirmed content', () => {
    const prev = [pending(-1, 'hi', 'sending'), pending(-2, 'hi', 'sending')];
    const next = resolvePendingMessage(prev, msg(9, { content: 'hi' }));
    expect(next.map((p) => p.id)).toEqual([-2]);
  });

  it('ignores errored entries with the same content', () => {
    const prev = [pending(-1, 'hi', 'error')];
    expect(resolvePendingMessage(prev, msg(9, { content: 'hi' }))).toBe(prev);
  });

  it('returns the same array when nothing matches', () => {
    const prev = [pending(-1, 'other', 'sending')];
    expect(resolvePendingMessage(prev, msg(9, { content: 'hi' }))).toBe(prev);
  });
});

describe('markPendingAsError', () => {
  it('flags sending entries and leaves errored ones untouched', () => {
    const prev: ChatMessage[] = [
      { ...msg(-1), status: 'sending' },
      { ...msg(-2), status: 'error' },
    ];
    const next = markPendingAsError(prev);
    expect(next.map((p) => p.status)).toEqual(['error', 'error']);
    expect(prev[0].status).toBe('sending');
  });
});
