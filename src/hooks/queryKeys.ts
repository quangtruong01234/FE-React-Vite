import type { ProductParams } from '@/types';

export const queryKeys = {
  products: {
    all: ['products'] as const,
    list: (params: ProductParams) => ['products', 'list', params] as const,
    detail: (id: number) => ['products', id] as const,
    withInventory: (id: number) => ['products', id, 'inventory'] as const,
    cartItems: (ids: number[]) => ['products', 'cart-items', ids] as const,
    bySku: (sku: string) => ['products', 'sku', sku] as const,
    byCategory: (categoryId: number) => ['products', 'category', categoryId] as const,
    byBrand: (brandId: number) => ['products', 'brand', brandId] as const,
    shopStats: ['products', 'shop-stats'] as const,
  },
  brands: {
    all: ['brands'] as const,
    detail: (id: number) => ['brands', id] as const,
    pending: ['brands', 'pending'] as const,
  },
  categories: {
    all: ['categories'] as const,
    detail: (id: number) => ['categories', id] as const,
    pending: ['categories', 'pending'] as const,
  },
  orders: {
    all: ['orders'] as const,
    byUser: (userId: number) => ['orders', 'user', userId] as const,
    statusCounts: (userId: number) => ['orders', 'user', userId, 'status-counts'] as const,
    detail: (id: number) => ['orders', id] as const,
    admin: ['orders', 'admin'] as const,
    seller: ['orders', 'seller'] as const,
    sellerList: (page: number, limit: number, status?: string) => ['orders', 'seller', page, limit, status] as const,
    sellerDetail: (id: number) => ['orders', 'seller', 'detail', id] as const,
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
    followingFeed: (userId: number) => ['social', 'following-feed', userId] as const,
    postsByUser: (userId: number, page = 1) => ['social', 'user', userId, 'posts', page] as const,
    post: (id: number) => ['social', 'posts', id] as const,
    comments: (postId: number) => ['social', 'posts', postId, 'comments'] as const,
    replies: (commentId: number) => ['social', 'comments', commentId, 'replies'] as const,
    followers: (userId: number) => ['social', 'user', userId, 'followers'] as const,
    following: (userId: number) => ['social', 'user', userId, 'following'] as const,
    isFollowing: (viewerId: number, targetId: number) => ['social', 'is-following', viewerId, targetId] as const,
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
  cart: {
    all: ['cart'] as const,
  },
  misc: {
    health: ['misc', 'health'] as const,
  },
  reviews: {
    byProduct: (productId: number) => ['reviews', 'product', productId] as const,
  },
};
