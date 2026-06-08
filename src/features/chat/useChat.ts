import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/hooks/queryKeys';
import { api } from '@/api';
import type { Conversation, Message, PaginatedResponse } from '@/types';

export type ChatMessage = Message & { status?: 'sending' | 'error' };

const STALE_KEY = 'tb:chat:activity';
const STALE_MS = 3 * 24 * 60 * 60 * 1000;

function readActivityMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STALE_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function markActivity(conversationId: number): void {
  const map = readActivityMap();
  map[String(conversationId)] = new Date().toISOString();
  localStorage.setItem(STALE_KEY, JSON.stringify(map));
}

const CHAT_URL = (import.meta.env.VITE_CHAT_URL as string | undefined) ?? 'http://localhost:3000';

type ChatSocket = Socket<
  { new_message: (msg: Message) => void; error: (err: string) => void },
  { join: (conversationId: number) => void; leave: (conversationId: number) => void; send_message: (payload: { conversationId: number; content: string }) => void }
>;

export function useConversations(): { conversations: Conversation[]; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.conversations.all,
    queryFn: () => api.chat.getConversations(),
  });

  const conversations = useMemo(() => {
    if (!data) return [];
    const activityMap = readActivityMap();
    const threshold = Date.now() - STALE_MS;
    return data.filter((c) => {
      const lastActivity = activityMap[String(c.id)] ?? c.createdAt;
      return new Date(lastActivity).getTime() > threshold;
    });
  }, [data]);

  return { conversations, isLoading };
}

export function useChat(conversationId: number): {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (content: string, senderId: number) => void;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
} {
  const [socketMessages, setSocketMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const tempIdRef = useRef(-1);

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

  useEffect(() => {
    if (conversationId <= 0) return;

    const socket: ChatSocket = io(`${CHAT_URL}/chat`, { withCredentials: true });
    socketRef.current = socket;

    socket.emit('join', { conversationId });

    socket.on('new_message', (msg: Message) => {
      if (msg.conversationId === conversationId) {
        markActivity(conversationId);
        setSocketMessages((prev) => [...prev, msg]);
        setPendingMessages((prev) => {
          const idx = prev.findIndex((p) => p.content === msg.content && p.status === 'sending');
          if (idx === -1) return prev;
          return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
        });
        queryClient.setQueryData<Conversation[]>(queryKeys.conversations.all, (old) => {
          if (!old) return old;
          return old.map((c) =>
            c.id === conversationId ? { ...c, updatedAt: msg.createdAt } : c,
          ) as Conversation[];
        });
      }
    });

    socket.on('error', (err: string) => {
      console.error('[ChatSocket]', err);
      setPendingMessages((prev) =>
        prev.map((p) => (p.status === 'sending' ? { ...p, status: 'error' as const } : p)),
      );
    });

    return () => {
      socket.emit('leave', conversationId);
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
    markActivity(conversationId);
  }

  return { messages, isLoading, sendMessage, hasNextPage, fetchNextPage, isFetchingNextPage };
}

function mergeMessages(http: Message[], socket: Message[]): Message[] {
  if (socket.length === 0) return http;
  const seen = new Set(http.map((m) => m.id));
  const fresh = socket.filter((m) => !seen.has(m.id));
  return [...http, ...fresh];
}

export type { PaginatedResponse };
