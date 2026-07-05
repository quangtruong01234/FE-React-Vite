import type { ServerCart, AddToCartDto, UpdateCartItemDto } from '@/types';
import { request } from './client';

export const cartApi = {
  get: (): Promise<ServerCart | null> =>
    request<ServerCart | null>('/cart'),

  addItem: (data: AddToCartDto): Promise<ServerCart> =>
    request<ServerCart>('/cart', { method: 'POST', body: JSON.stringify(data) }),

  updateItem: (itemId: number, data: UpdateCartItemDto): Promise<void> =>
    request(`/cart/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  removeItem: (itemId: number): Promise<void> =>
    request(`/cart/items/${itemId}`, { method: 'DELETE' }),

  clear: (): Promise<void> =>
    request('/cart', { method: 'DELETE' }),
};
