import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/hooks/queryKeys';
import { api } from '@/api';
import type { Conversation, Message, PaginatedResponse } from '@/types';

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
  return { conversations: data ?? [], isLoading };
}

export function useChat(conversationId: number): {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (content: string) => void;
} {
  const [socketMessages, setSocketMessages] = useState<Message[]>([]);

  const { data: page, isLoading } = useQuery({
    queryKey: queryKeys.messages.byConversation(conversationId),
    queryFn: () => api.chat.getMessages(conversationId),
    enabled: conversationId > 0,
  });

  const httpMessages = (page?.data ?? []).slice().reverse();
  const messages = mergeMessages(httpMessages, socketMessages);

  const socketRef = useRef<ChatSocket | null>(null);
  const prevConvRef = useRef<number>(0);

  useEffect(() => {
    if (conversationId <= 0) return;

    const socket: ChatSocket = io(`${CHAT_URL}/chat`, { withCredentials: true });
    socketRef.current = socket;

    socket.emit('join', { conversationId });
    prevConvRef.current = conversationId;

    socket.on('new_message', (msg: Message) => {
      if (msg.conversationId === conversationId) {
        setSocketMessages((prev) => [...prev, msg]);
        // update conversation list preview
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
    });

    return () => {
      socket.emit('leave', conversationId);
      socket.disconnect();
      socketRef.current = null;
      setSocketMessages([]);
    };
  }, [conversationId]);

  function sendMessage(content: string): void {
    socketRef.current?.emit('send_message', { conversationId, content });
  }

  return { messages, isLoading, sendMessage };
}

function mergeMessages(http: Message[], socket: Message[]): Message[] {
  if (socket.length === 0) return http;
  const seen = new Set(http.map((m) => m.id));
  const fresh = socket.filter((m) => !seen.has(m.id));
  return [...http, ...fresh];
}

// re-export PaginatedResponse shape for convenience
export type { PaginatedResponse };
