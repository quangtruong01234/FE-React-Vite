import type { ProductParams } from '@/types';

export const queryKeys = {
  products: {
    all: ['products'] as const,
    list: (params: ProductParams) => ['products', 'list', params] as const,
    detail: (id: number) => ['products', id] as const,
    withInventory: (id: number) => ['products', id, 'inventory'] as const,
    bySku: (sku: string) => ['products', 'sku', sku] as const,
    byCategory: (categoryId: number) => ['products', 'category', categoryId] as const,
    byBrand: (brandId: number) => ['products', 'brand', brandId] as const,
  },
  brands: {
    all: ['brands'] as const,
    detail: (id: number) => ['brands', id] as const,
  },
  categories: {
    all: ['categories'] as const,
    detail: (id: number) => ['categories', id] as const,
  },
  orders: {
    all: ['orders'] as const,
    byUser: (userId: number) => ['orders', 'user', userId] as const,
    detail: (id: number) => ['orders', id] as const,
    admin: ['orders', 'admin'] as const,
  },
  auth: {
    me: ['auth', 'me'] as const,
  },
  users: {
    all: ['users'] as const,
    detail: (id: number) => ['users', id] as const,
  },
  social: {
    feed: (page: number) => ['social', 'feed', page] as const,
    postsByUser: (userId: number) => ['social', 'user', userId, 'posts'] as const,
    post: (id: number) => ['social', 'posts', id] as const,
    comments: (postId: number) => ['social', 'posts', postId, 'comments'] as const,
    replies: (commentId: number) => ['social', 'comments', commentId, 'replies'] as const,
  },
  notifications: {
    list: (page: number) => ['notifications', 'list', page] as const,
    unreadCount: ['notifications', 'unread'] as const,
  },
  conversations: {
    all: ['conversations'] as const,
  },
  messages: {
    byConversation: (conversationId: number) => ['messages', 'conversation', conversationId] as const,
  },
  payment: {
    options: ['payment', 'options'] as const,
  },
  inventory: {
    all: ['inventory'] as const,
    lowStock: ['inventory', 'low-stock'] as const,
    byProduct: (productId: number) => ['inventory', 'product', productId] as const,
    bySku: (sku: string) => ['inventory', 'sku', sku] as const,
    detail: (id: number) => ['inventory', id] as const,
  },
  misc: {
    health: ['misc', 'health'] as const,
  },
};
