import type { User, UpdateUserDto, PaginatedResponse, FeaturedSeller } from '@/types';
import { request, toQuery } from './client';

export const usersApi = {
  getById: (id: number): Promise<User> =>
    request<User>(`/user/${id}`),

  update: (id: number, data: UpdateUserDto): Promise<User> =>
    request<User>(`/user/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getAll: (): Promise<User[]> =>
    request<User[]>('/user/all'),

  // Any authenticated role — replaces the admin-only /user/all for the feed right-rail.
  getFeaturedSellers: (limit = 5): Promise<FeaturedSeller[]> => {
    const qs = toQuery({ limit });
    return request<FeaturedSeller[]>(`/user/featured-sellers${qs}`);
  },

  getPaginated: (page = 1, limit = 20): Promise<PaginatedResponse<User>> => {
    const qs = toQuery({ page, limit });
    return request<PaginatedResponse<User>>(`/user${qs}`);
  },
};
