import type { Socket } from 'socket.io-client';
import { queryClient } from '@/lib/query/queryClient';
import { queryKeys } from '@/hooks/query/queryKeys';
import { api } from '@/api';
import { createRefCountedSocket } from '@/lib/realtime/socket';
import { resolveSocketUrl } from '@/lib/realtime/socketUrl';
import { playMessageReceived } from '@/lib/realtime/chatSound';
import { applyIncomingMessage } from './chatConversations';
import { appendMessageToCache, type MessagesInfiniteData } from './chatMessages';
import { shouldPlayPresenceSound } from './chatPresence';
import type { Conversation, Message } from '@/types';

const CHAT_SOCKET_URL = resolveSocketUrl(import.meta.env.VITE_CHAT_URL as string | undefined, '/chat');

type PresenceSocket = Socket<{ new_message: (msg: Message) => void }, Record<string, never>>;

let viewerId: string | undefined;
let activeConversationId: string | null = null;

/**
 * Register the conversation the viewer currently has open. Its own socket
 * (`useChat`) handles that thread's message + sound, so the presence listener
 * skips it to avoid playing the beep twice. Pass `null` when no thread is open.
 */
export function setActiveConversation(id: string | null): void {
  activeConversationId = id;
}

/**
 * Single app-scoped chat socket so an online viewer hears a sound for any
 * incoming message — even on a thread they are not looking at, or while on
 * another page entirely. Ref-counted via `lib/socket` (same lifecycle as the
 * notification socket): one connection for the whole app, opened by the first
 * consumer and closed by the last.
 *
 * This socket joins **nothing**. The gateway puts every chat socket into
 * `user:{id}` on connect and emits `new_message` to both participants' user
 * rooms (backend CHAT-ROOM-01, live on prod since 2026-09-10), so every message
 * the viewer is party to arrives here with no `join` round trip — including on
 * threads created after connect. Do not reintroduce the old
 * join-every-conversation loop: it needed a module-scope Set of joined ids that
 * had to be cleared on every reconnect, and missing that clear left the socket
 * sitting in no room at all, silently, until a full page reload.
 */
const presenceSocket = createRefCountedSocket<PresenceSocket>(CHAT_SOCKET_URL, {
  onCreate: (socket) => {
    // Messages that arrived while the socket was down were never delivered, so
    // the cached previews/badges are stale once it comes back — refetch on every
    // connect. `useConversations` would not do it: staleTime is 60s and
    // `refetchOnWindowFocus` is off, so a list that stays mounted never re-asks.
    socket.on('connect', () => {
      void api.chat.getConversations().then((convs) => {
        queryClient.setQueryData(queryKeys.conversations.all, convs);
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
  },
  onDestroy: () => {
    viewerId = undefined;
    activeConversationId = null;
  },
});

/** @returns a release function for the caller's effect cleanup. */
export function acquireChatPresenceSocket(meId: string | undefined): () => void {
  viewerId = meId;
  return presenceSocket.acquire();
}
