import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery, useMutation } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { queryClient } from '@/lib/query/queryClient';
import { queryKeys } from '@/hooks/query/queryKeys';
import { api } from '@/api';
import { playMessageReceived } from '@/lib/realtime/chatSound';
import { applyIncomingMessage, markConversationReadInList } from './chatConversations';
import {
  appendMessageToCache, mergeMessages, resolvePendingMessage, markPendingAsError,
  type ChatMessage, type MessagesInfiniteData,
} from './chatMessages';
import { acquireChatPresenceSocket, setActiveConversation } from './chatPresenceSocket';
import { SOCKET_CONNECT_OPTIONS } from '@/lib/realtime/socket';
import { useResetOnChange } from '@/hooks/ui/useResetOnChange';
import type { ChatConnectionStatus } from './chatConnection';
import type { Conversation, Message, PaginatedResponse } from '@/types';

export type { ChatMessage };

const CHAT_URL = (import.meta.env.VITE_CHAT_URL as string | undefined) ?? 'http://localhost:3000';

type ChatSocket = Socket<
  { new_message: (msg: Message) => void; error: (err: string) => void },
  { join: (payload: { conversationId: string }) => void; leave: (payload: { conversationId: string }) => void; send_message: (payload: { conversationId: string; content: string; parentMessageId?: string }) => void }
>;

export function useConversations(): { conversations: Conversation[]; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.conversations.all,
    queryFn: () => api.chat.getConversations(),
  });

  // Backend returns conversations ordered most-recently-active first, with
  // `lastMessage` + `unreadCount` per item — no client-side sort/staleness needed.
  return { conversations: data ?? [], isLoading };
}

/**
 * Open the single app-scoped chat presence socket so an online viewer hears a
 * sound for any incoming message, on any thread, from anywhere in the app.
 * Mount once high in the tree (the Header is always rendered when authenticated).
 */
export function useChatPresence(meId?: string): void {
  useEffect(() => acquireChatPresenceSocket(meId), [meId]);
}

/**
 * Mark a conversation read on the server and optimistically clear its unread
 * badge in the cached list. Call when the viewer opens a thread.
 */
export function useMarkConversationRead(): (conversationId: string) => void {
  const { mutate } = useMutation({
    mutationFn: (conversationId: string) => api.chat.markConversationRead(conversationId),
    onMutate: (conversationId: string) => {
      queryClient.setQueryData<Conversation[]>(queryKeys.conversations.all, (old) =>
        old ? markConversationReadInList(old, conversationId) : old,
      );
    },
  });
  return mutate;
}

export function useChat(conversationId: string, currentUserId?: string): {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (content: string, senderId: string) => void;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  connectionStatus: ChatConnectionStatus;
} {
  const [socketMessages, setSocketMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ChatConnectionStatus>('connecting');
  const tempIdRef = useRef(0);

  // Keep the latest viewer id in a ref so the socket handler reads it without
  // re-subscribing on every account change (and never fires a stale sound).
  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // Back to "connecting" the moment the thread changes — adjusted during render
  // so no frame shows the previous thread's status while the socket effect
  // reconnects. An emptied id tears down without reconnecting, so no reset.
  useResetOnChange(conversationId, () => {
    if (conversationId) setConnectionStatus('connecting');
  });

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: queryKeys.messages.byConversation(conversationId),
    queryFn: ({ pageParam }) => api.chat.getMessages(conversationId, pageParam as number, 10),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasNext ? (lastPageParam as number) + 1 : undefined,
    enabled: conversationId.length > 0,
  });

  // All pages: page 1 = newest 10, page 2 = next older 10, etc.
  // flatMap then reverse gives oldest→newest order for display
  const allPageMessages = data?.pages.flatMap((p) => p.data) ?? [];
  const httpMessages = allPageMessages.slice().reverse();
  const confirmed = mergeMessages(httpMessages, socketMessages);
  const messages: ChatMessage[] = [...confirmed, ...pendingMessages];

  const socketRef = useRef<ChatSocket | null>(null);

  // Tell the app-scoped presence socket which thread is open so it doesn't also
  // beep for it (this thread's own socket below handles that).
  useEffect(() => {
    if (!conversationId) return;
    setActiveConversation(conversationId);
    return () => setActiveConversation(null);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    const socket: ChatSocket = io(`${CHAT_URL}/chat`, SOCKET_CONNECT_OPTIONS);
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionStatus('connected');
      socket.emit('join', { conversationId });
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    // socket.io manager reconnection lifecycle
    socket.io.on('reconnect_attempt', () => setConnectionStatus('reconnecting'));
    socket.io.on('error', () => setConnectionStatus('reconnecting'));

    socket.on('new_message', (msg: Message) => {
      if (msg.conversationId === conversationId) {
        const viewerId = currentUserIdRef.current;
        if (viewerId !== undefined && msg.senderId !== viewerId) {
          playMessageReceived();
        }
        setSocketMessages((prev) => [...prev, msg]);
        // Persist into the paginated cache so the message survives this thread
        // unmounting (switching conversations) and shows instantly on return —
        // instead of waiting for a stale-cache refetch.
        queryClient.setQueryData<MessagesInfiniteData>(
          queryKeys.messages.byConversation(conversationId),
          (old) => appendMessageToCache(old, msg),
        );
        setPendingMessages((prev) => resolvePendingMessage(prev, msg));
        // Refresh the list preview/order; this thread is open so it stays read.
        queryClient.setQueryData<Conversation[]>(queryKeys.conversations.all, (old) =>
          old ? applyIncomingMessage(old, msg, viewerId, conversationId) : old,
        );
      }
    });

    socket.on('error', (err: string) => {
      console.error('[ChatSocket]', err);
      setPendingMessages(markPendingAsError);
    });

    return () => {
      socket.emit('leave', { conversationId });
      socket.io.removeAllListeners();
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setSocketMessages([]);
      setPendingMessages([]);
    };
  }, [conversationId]);

  function sendMessage(content: string, senderId: string): void {
    const tempId = `pending_${tempIdRef.current++}`;
    const pending: ChatMessage = {
      id: tempId,
      conversationId,
      senderId,
      content,
      parentMessageId: null,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };
    setPendingMessages((prev) => [...prev, pending]);
    socketRef.current?.emit('send_message', { conversationId, content });
  }

  return { messages, isLoading, sendMessage, hasNextPage, fetchNextPage, isFetchingNextPage, connectionStatus };
}

export type { PaginatedResponse };
