import { describe, it, expect } from 'vitest';
import type { Conversation, Message } from '@/types';
import {
  conversationActivityTime,
  sortByActivity,
  applyIncomingMessage,
  markConversationReadInList,
} from './chatConversations';

function conv(id: number, partial: Partial<Conversation> = {}): Conversation {
  return {
    id,
    user1Id: 1,
    user2Id: 2,
    createdAt: '2026-06-20T00:00:00.000Z',
    user1LastReadAt: null,
    user2LastReadAt: null,
    lastMessage: null,
    unreadCount: 0,
    ...partial,
  };
}

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

describe('conversationActivityTime', () => {
  it('uses lastMessage time when present', () => {
    const c = conv(1, {
      createdAt: '2026-06-01T00:00:00.000Z',
      lastMessage: { id: 9, content: 'hi', senderId: 2, createdAt: '2026-06-26T00:00:00.000Z' },
    });
    expect(conversationActivityTime(c)).toBe(new Date('2026-06-26T00:00:00.000Z').getTime());
  });

  it('falls back to createdAt when there is no last message', () => {
    const c = conv(1, { createdAt: '2026-06-01T00:00:00.000Z', lastMessage: null });
    expect(conversationActivityTime(c)).toBe(new Date('2026-06-01T00:00:00.000Z').getTime());
  });
});

describe('sortByActivity', () => {
  it('orders most-recently-active first without mutating the input', () => {
    const a = conv(1, { lastMessage: { id: 1, content: 'a', senderId: 2, createdAt: '2026-06-26T08:00:00.000Z' } });
    const b = conv(2, { lastMessage: { id: 2, content: 'b', senderId: 2, createdAt: '2026-06-26T09:00:00.000Z' } });
    const input = [a, b];
    const sorted = sortByActivity(input);
    expect(sorted.map((c) => c.id)).toEqual([2, 1]);
    expect(input.map((c) => c.id)).toEqual([1, 2]); // unchanged
  });
});

describe('applyIncomingMessage', () => {
  it('updates lastMessage and floats the thread to the top', () => {
    const a = conv(1, { lastMessage: { id: 1, content: 'old', senderId: 2, createdAt: '2026-06-26T07:00:00.000Z' } });
    const b = conv(2, { lastMessage: { id: 2, content: 'b', senderId: 2, createdAt: '2026-06-26T09:00:00.000Z' } });
    const result = applyIncomingMessage([a, b], msg(5, { conversationId: 1, content: 'new', createdAt: '2026-06-26T10:00:00.000Z' }), 1, null);
    expect(result.map((c) => c.id)).toEqual([1, 2]);
    expect(result[0].lastMessage?.content).toBe('new');
  });

  it('bumps unreadCount for an inbound message on a non-active thread', () => {
    const c = conv(1, { unreadCount: 2 });
    const result = applyIncomingMessage([c], msg(5, { senderId: 2 }), 1, null);
    expect(result[0].unreadCount).toBe(3);
  });

  it('keeps the active thread read (unreadCount 0)', () => {
    const c = conv(1, { unreadCount: 4 });
    const result = applyIncomingMessage([c], msg(5, { senderId: 2 }), 1, 1);
    expect(result[0].unreadCount).toBe(0);
  });

  it('does not bump unread for the viewer’s own outbound message', () => {
    const c = conv(1, { unreadCount: 1 });
    const result = applyIncomingMessage([c], msg(5, { senderId: 1 }), 1, null);
    expect(result[0].unreadCount).toBe(1);
  });
});

describe('markConversationReadInList', () => {
  it('zeroes only the targeted conversation', () => {
    const a = conv(1, { unreadCount: 3 });
    const b = conv(2, { unreadCount: 5 });
    const result = markConversationReadInList([a, b], 1);
    expect(result.find((c) => c.id === 1)?.unreadCount).toBe(0);
    expect(result.find((c) => c.id === 2)?.unreadCount).toBe(5);
  });
});
