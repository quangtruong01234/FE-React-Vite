import type {
  User,
  PublicUser,
  UpdateUserDto,
  PaginatedResponse,
  FeaturedSeller,
  Address,
  CreateAddressDto,
  UpdateAddressDto,
} from '@/types';
import { request, toQuery } from './client';

export const usersApi = {
  // Public read — no email/role (backend strips them from public profiles, 2026-07-07).
  getById: (id: string): Promise<PublicUser> =>
    request<PublicUser>(`/user/${id}`),

  update: (id: string, data: UpdateUserDto): Promise<User> =>
    request<User>(`/user/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Note: the admin-only `GET /user/all` was removed backend-side (2026-07-06);
  // use `getPaginated` (admin list) or `getFeaturedSellers` (feed right-rail).

  // Any authenticated role — replaces the admin-only /user/all for the feed right-rail.
  getFeaturedSellers: (limit = 5): Promise<FeaturedSeller[]> => {
    const qs = toQuery({ limit });
    return request<FeaturedSeller[]>(`/user/featured-sellers${qs}`);
  },

  getPaginated: (page = 1, limit = 20): Promise<PaginatedResponse<User>> => {
    const qs = toQuery({ page, limit });
    return request<PaginatedResponse<User>>(`/user${qs}`);
  },

  // --- Address book (structured GHN checkout, handoff 2026-07-01) ---
  // Scoped to the authenticated user; returned default-first then newest-first.
  getAddresses: (): Promise<Address[]> =>
    request<Address[]>('/user/me/addresses'),

  // First address is forced default server-side; `isDefault:true` demotes the rest.
  createAddress: (data: CreateAddressDto): Promise<Address> =>
    request<Address>('/user/me/addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAddress: (addressId: string, data: UpdateAddressDto): Promise<Address> =>
    request<Address>(`/user/me/addresses/${addressId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  setDefaultAddress: (addressId: string): Promise<Address> =>
    request<Address>(`/user/me/addresses/${addressId}/default`, {
      method: 'PATCH',
    }),

  // Deleting the default auto-promotes the most-recent remaining address.
  deleteAddress: (addressId: string): Promise<{ success: boolean }> =>
    request<{ success: boolean }>(`/user/me/addresses/${addressId}`, {
      method: 'DELETE',
    }),
};
