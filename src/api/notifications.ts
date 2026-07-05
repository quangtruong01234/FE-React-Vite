import type { Notification, PaginatedResponse } from '@/types';
import { request, toQuery } from './client';

export const notificationsApi = {
  getList: (page = 1, limit = 20): Promise<PaginatedResponse<Notification>> => {
    const qs = toQuery({ page, limit });
    return request<PaginatedResponse<Notification>>(`/notifications${qs}`);
  },

  markRead: (id: number): Promise<{ success: boolean }> =>
    request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' }),

  getUnreadCount: (): Promise<{ unreadCount: number }> =>
    request('/notifications/unread-count'),
};
