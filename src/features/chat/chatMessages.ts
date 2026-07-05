import type { InfiniteData } from '@tanstack/react-query';
import type { Message, PaginatedResponse } from '@/types';

export type MessagesInfiniteData = InfiniteData<PaginatedResponse<Message>>;

export type ChatMessage = Message & { status?: 'sending' | 'error' };

/**
 * Confirmed messages for display: HTTP history (oldest→newest) plus socket
 * arrivals whose ids the history doesn't already contain, in arrival order.
 */
export function mergeMessages(http: Message[], socket: Message[]): Message[] {
  if (socket.length === 0) return http;
  const seen = new Set(http.map((m) => m.id));
  const fresh = socket.filter((m) => !seen.has(m.id));
  return [...http, ...fresh];
}

/**
 * Drop the first in-flight optimistic send matched by a confirmed echo of the
 * same content — the server message replaces it in the confirmed list.
 */
export function resolvePendingMessage(pending: ChatMessage[], confirmed: Message): ChatMessage[] {
  const idx = pending.findIndex((p) => p.content === confirmed.content && p.status === 'sending');
  if (idx === -1) return pending;
  return [...pending.slice(0, idx), ...pending.slice(idx + 1)];
}

/** Flag every in-flight optimistic send as failed (socket-level error). */
export function markPendingAsError(pending: ChatMessage[]): ChatMessage[] {
  return pending.map((p) => (p.status === 'sending' ? { ...p, status: 'error' as const } : p));
}

/**
 * Persist a freshly-arrived socket message into the paginated messages cache so
 * it survives the thread unmounting (switching conversations) and reappears
 * instantly on return — instead of vanishing until a stale-cache refetch lands.
 *
 * Page 0 holds the newest batch, newest-first (the query reverses all pages for
 * display), so the message is prepended there. No-ops when the cache is empty
 * (nothing fetched yet — a fresh fetch on next open will include it) or the id
 * is already present (dedupe against our own send echo / a re-delivery from the
 * second socket).
 */
export function appendMessageToCache(
  old: MessagesInfiniteData | undefined,
  message: Message,
): MessagesInfiniteData | undefined {
  if (!old || old.pages.length === 0) return old;
  const alreadyPresent = old.pages.some((p) => p.data.some((m) => m.id === message.id));
  if (alreadyPresent) return old;
  const [first, ...rest] = old.pages;
  return {
    ...old,
    pages: [{ ...first, data: [message, ...first.data], total: first.total + 1 }, ...rest],
  };
}
