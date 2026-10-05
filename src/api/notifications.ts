import type { Notification, PaginatedResponse } from '@/types';
import { request, toQuery } from './client';

export const notificationsApi = {
  /**
   * `unreadOnly` filters server-side, so `total`/`totalPages` follow the filter
   * (NOTIF-INBOX-01). Only the literal `true` is sent — the backend 400s on `1`
   * or `TRUE`, and omitting the param is the unfiltered list.
   */
  getList: (page = 1, limit = 20, unreadOnly = false): Promise<PaginatedResponse<Notification>> => {
    const qs = toQuery({ page, limit, unreadOnly: unreadOnly ? 'true' : undefined });
    return request<PaginatedResponse<Notification>>(`/notifications${qs}`);
  },

  markRead: (id: string): Promise<{ success: boolean }> =>
    request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' }),

  /** Marks every one of the caller's rows read; a repeat call answers `updatedCount: 0`. */
  markAllRead: (): Promise<{ updatedCount: number }> =>
    request<{ updatedCount: number }>('/notifications/read-all', { method: 'PATCH' }),

  /** Hard delete, `204` with no body. Unknown, foreign or already-deleted ids are a `404`. */
  remove: (id: string): Promise<void> =>
    request<void>(`/notifications/${id}`, { method: 'DELETE' }),

  getUnreadCount: (): Promise<{ unreadCount: number }> =>
    request('/notifications/unread-count'),
};
