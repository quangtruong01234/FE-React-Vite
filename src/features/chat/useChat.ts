import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery, useMutation } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/hooks/queryKeys';
import { api } from '@/api';
import { playMessageReceived } from '@/lib/chatSound';
import { applyIncomingMessage, markConversationReadInList } from './chatConversations';
import { acquireChatPresenceSocket, setActiveConversation } from './chatPresenceSocket';
import type { ChatConnectionStatus } from './chatConnection';
import type { Conversation, Message, PaginatedResponse } from '@/types';

export type ChatMessage = Message & { status?: 'sending' | 'error' };

const CHAT_URL = (import.meta.env.VITE_CHAT_URL as string | undefined) ?? 'http://localhost:3000';

type ChatSocket = Socket<
  { new_message: (msg: Message) => void; error: (err: string) => void },
  { join: (payload: { conversationId: number }) => void; leave: (payload: { conversationId: number }) => void; send_message: (payload: { conversationId: number; content: string }) => void }
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
export function useChatPresence(meId?: number): void {
  useEffect(() => acquireChatPresenceSocket(meId), [meId]);
}

/**
 * Mark a conversation read on the server and optimistically clear its unread
 * badge in the cached list. Call when the viewer opens a thread.
 */
export function useMarkConversationRead(): (conversationId: number) => void {
  const { mutate } = useMutation({
    mutationFn: (conversationId: number) => api.chat.markConversationRead(conversationId),
    onMutate: (conversationId: number) => {
      queryClient.setQueryData<Conversation[]>(queryKeys.conversations.all, (old) =>
        old ? markConversationReadInList(old, conversationId) : old,
      );
    },
  });
  return mutate;
}

export function useChat(conversationId: number, currentUserId?: number): {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (content: string, senderId: number) => void;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  connectionStatus: ChatConnectionStatus;
} {
  const [socketMessages, setSocketMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ChatConnectionStatus>('connecting');
  const tempIdRef = useRef(-1);

  // Keep the latest viewer id in a ref so the socket handler reads it without
  // re-subscribing on every account change (and never fires a stale sound).
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: queryKeys.messages.byConversation(conversationId),
    queryFn: ({ pageParam }) => api.chat.getMessages(conversationId, pageParam as number, 10),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasNext ? (lastPageParam as number) + 1 : undefined,
    enabled: conversationId > 0,
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
    if (conversationId <= 0) return;
    setActiveConversation(conversationId);
    return () => setActiveConversation(null);
  }, [conversationId]);

  useEffect(() => {
    if (conversationId <= 0) return;

    setConnectionStatus('connecting');
    const socket: ChatSocket = io(`${CHAT_URL}/chat`, { withCredentials: true });
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
        setPendingMessages((prev) => {
          const idx = prev.findIndex((p) => p.content === msg.content && p.status === 'sending');
          if (idx === -1) return prev;
          return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
        });
        // Refresh the list preview/order; this thread is open so it stays read.
        queryClient.setQueryData<Conversation[]>(queryKeys.conversations.all, (old) =>
          old ? applyIncomingMessage(old, msg, viewerId, conversationId) : old,
        );
      }
    });

    socket.on('error', (err: string) => {
      console.error('[ChatSocket]', err);
      setPendingMessages((prev) =>
        prev.map((p) => (p.status === 'sending' ? { ...p, status: 'error' as const } : p)),
      );
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

  function sendMessage(content: string, senderId: number): void {
    const tempId = tempIdRef.current--;
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

function mergeMessages(http: Message[], socket: Message[]): Message[] {
  if (socket.length === 0) return http;
  const seen = new Set(http.map((m) => m.id));
  const fresh = socket.filter((m) => !seen.has(m.id));
  return [...http, ...fresh];
}

export type { PaginatedResponse };
