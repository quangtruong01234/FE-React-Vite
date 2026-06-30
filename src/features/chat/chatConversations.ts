import type { Conversation, Message } from '@/types';

/**
 * Activity timestamp used to order the conversation list "most recently active
 * first" — the last message time, falling back to when the thread was created.
 */
export function conversationActivityTime(c: Conversation): number {
  return new Date(c.lastMessage?.createdAt ?? c.createdAt).getTime();
}

/** Most-recently-active first. Stable copy — never mutates the input. */
export function sortByActivity(convs: Conversation[]): Conversation[] {
  return [...convs].sort((a, b) => conversationActivityTime(b) - conversationActivityTime(a));
}

/**
 * Apply a freshly-arrived message to the cached conversation list: refresh the
 * matching thread's `lastMessage`, adjust its `unreadCount`, then re-sort so it
 * floats to the top.
 *
 * - The conversation the viewer is currently looking at (`activeConversationId`)
 *   is treated as read → `unreadCount` stays 0.
 * - An inbound message (sender ≠ viewer) on any other thread bumps its badge.
 * - The viewer's own outbound message never bumps a badge.
 */
export function applyIncomingMessage(
  convs: Conversation[],
  message: Pick<Message, 'id' | 'conversationId' | 'senderId' | 'content' | 'createdAt'>,
  viewerId: number | undefined,
  activeConversationId: number | null,
): Conversation[] {
  const updated = convs.map((c) => {
    if (c.id !== message.conversationId) return c;
    const isInbound = viewerId !== undefined && message.senderId !== viewerId;
    let unreadCount = c.unreadCount;
    if (c.id === activeConversationId) {
      unreadCount = 0;
    } else if (isInbound) {
      unreadCount = c.unreadCount + 1;
    }
    return {
      ...c,
      lastMessage: {
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        createdAt: message.createdAt,
      },
      unreadCount,
    };
  });
  return sortByActivity(updated);
}

/** Optimistically clear a conversation's unread badge (mirrors the read POST). */
export function markConversationReadInList(
  convs: Conversation[],
  conversationId: number,
): Conversation[] {
  return convs.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c));
}
