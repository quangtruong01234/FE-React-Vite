import type { ProductParams } from '@/types';

export const queryKeys = {
  products: {
    all: ['products'] as const,
    list: (params: ProductParams) => ['products', 'list', params] as const,
    detail: (id: number) => ['products', id] as const,
    withInventory: (id: number) => ['products', id, 'inventory'] as const,
  },
  orders: {
    all: ['orders'] as const,
    byUser: (userId: number) => ['orders', 'user', userId] as const,
  },
  auth: {
    me: ['auth', 'me'] as const,
  },
};
