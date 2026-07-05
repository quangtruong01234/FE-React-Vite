import type { Socket } from 'socket.io-client';
import { queryClient } from '@/lib/query/queryClient';
import { queryKeys } from '@/hooks/query/queryKeys';
import { api } from '@/api';
import { createRefCountedSocket } from '@/lib/realtime/socket';
import { playMessageReceived } from '@/lib/realtime/chatSound';
import { applyIncomingMessage } from './chatConversations';
import { appendMessageToCache, type MessagesInfiniteData } from './chatMessages';
import { shouldPlayPresenceSound, unjoinedConversationIds } from './chatPresence';
import type { Conversation, Message } from '@/types';

const CHAT_URL = (import.meta.env.VITE_CHAT_URL as string | undefined) ?? 'http://localhost:3000';

type PresenceSocket = Socket<
  { new_message: (msg: Message) => void },
  { join: (payload: { conversationId: number }) => void }
>;

let viewerId: number | undefined;
let activeConversationId: number | null = null;
const joined = new Set<number>();
let unsubscribeCache: (() => void) | null = null;

/**
 * Register the conversation the viewer currently has open. Its own socket
 * (`useChat`) handles that thread's message + sound, so the presence listener
 * skips it to avoid playing the beep twice. Pass `null` when no thread is open.
 */
export function setActiveConversation(id: number | null): void {
  activeConversationId = id;
}

function joinConversation(id: number): void {
  const socket = presenceSocket.current();
  if (!socket || joined.has(id)) return;
  socket.emit('join', { conversationId: id });
  joined.add(id);
}

function joinAll(convs: Conversation[]): void {
  unjoinedConversationIds(convs, joined).forEach(joinConversation);
}

/**
 * Single app-scoped chat socket so an online viewer hears a sound for any
 * incoming message — even on a thread they are not looking at, or while on
 * another page entirely. Ref-counted via `lib/socket` (same lifecycle as the
 * notification socket): one connection for the whole app, opened by the first
 * consumer and closed by the last.
 *
 * The documented chat contract is room-based (the server delivers `new_message`
 * only for conversations the socket has `join`ed), so on connect we join every
 * conversation the viewer has, and re-join whenever the conversation list cache
 * grows (e.g. a new thread is started while online).
 */
const presenceSocket = createRefCountedSocket<PresenceSocket>(`${CHAT_URL}/chat`, {
  onCreate: (socket) => {
    socket.on('connect', () => {
      const cached = queryClient.getQueryData<Conversation[]>(queryKeys.conversations.all);
      if (cached) joinAll(cached);
      void api.chat.getConversations().then((convs) => {
        queryClient.setQueryData(queryKeys.conversations.all, convs);
        joinAll(convs);
      });
    });

    socket.on('new_message', (msg: Message) => {
      if (shouldPlayPresenceSound(msg, viewerId, activeConversationId)) {
        playMessageReceived();
      }
      // Keep any already-cached thread current so it shows instantly when the
      // viewer opens it (dedupe-safe if useChat's own socket also wrote it).
      queryClient.setQueryData<MessagesInfiniteData>(
        queryKeys.messages.byConversation(msg.conversationId),
        (old) => appendMessageToCache(old, msg),
      );
      // Keep the list preview/badge live when it is mounted. The open thread is
      // owned by useChat (which marks it read), so skip the active conversation.
      if (msg.conversationId !== activeConversationId) {
        queryClient.setQueryData<Conversation[]>(queryKeys.conversations.all, (old) =>
          old ? applyIncomingMessage(old, msg, viewerId, activeConversationId) : old,
        );
      }
    });

    // Join threads created after connect (e.g. the viewer starts a new chat).
    const convKey = queryKeys.conversations.all[0];
    unsubscribeCache = queryClient.getQueryCache().subscribe((event) => {
      if (event.query.queryKey[0] !== convKey || !presenceSocket.current()?.connected) return;
      const convs = queryClient.getQueryData<Conversation[]>(queryKeys.conversations.all);
      if (convs) joinAll(convs);
    });
  },
  onDestroy: () => {
    unsubscribeCache?.();
    unsubscribeCache = null;
    joined.clear();
    viewerId = undefined;
    activeConversationId = null;
  },
});

/** @returns a release function for the caller's effect cleanup. */
export function acquireChatPresenceSocket(meId: number | undefined): () => void {
  viewerId = meId;
  return presenceSocket.acquire();
}
