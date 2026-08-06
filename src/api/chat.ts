import type { Conversation, Message, CreateConversationDto, PaginatedResponse } from '@/types';
import { request, toQuery } from './client';

export const chatApi = {
  createConversation: (data: CreateConversationDto): Promise<Conversation> =>
    request<Conversation>('/chat/conversations', { method: 'POST', body: JSON.stringify(data) }),

  getConversations: (): Promise<Conversation[]> =>
    request<Conversation[]>('/chat/conversations'),

  getMessages: (conversationId: string, page = 1, limit = 50): Promise<PaginatedResponse<Message>> => {
    const qs = toQuery({ page, limit });
    return request<PaginatedResponse<Message>>(`/chat/conversations/${conversationId}/messages${qs}`);
  },

  markConversationRead: (conversationId: string): Promise<void> =>
    request(`/chat/conversations/${conversationId}/read`, { method: 'POST' }),
};
