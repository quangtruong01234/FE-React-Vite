import type {
  User,
  Product,
  ProductWithInventory,
  PaginatedResponse,
  Brand,
  Category,
  Order,
  OrderWithBuyer,
  ProductParams,
  LoginDto,
  RegisterDto,
  CreateOrderDto,
  CreateProductDto,
  UpdateUserDto,
  CreateBrandDto,
  CreateCategoryDto,
  InventoryRecord,
  CreateInventoryDto,
  UpdateInventoryDto,
  StockCheckResponse,
  Post,
  Comment,
  CommentTree,
  CreatePostDto,
  CreateCommentDto,
  CreateReplyDto,
  LikeResult,
  FollowResult,
  FollowerItem,
  FollowingItem,
  Notification,
  Conversation,
  Message,
  CreateConversationDto,
  UploadSignature,
  HealthStatus,
  PaymentOption,
  PaymentResult,
  ApiError,
} from '@/types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    const apiError: ApiError = { status: res.status, message: err.message ?? res.statusText };
    throw apiError;
  }
  const json = await res.json() as T | { data: T };
  if (json !== null && typeof json === 'object' && 'data' in json && !Array.isArray(json)) {
    return (json as { data: T }).data;
  }
  return json as T;
}

function toQuery(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (!entries.length) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

export const api = {
  auth: {
    login: (data: LoginDto): Promise<User> =>
      request<User>('/user/login', { method: 'POST', body: JSON.stringify(data) }),

    register: (data: RegisterDto): Promise<User> =>
      request<User>('/user/register', { method: 'POST', body: JSON.stringify(data) }),

    logout: (): Promise<void> =>
      request('/user/logout', { method: 'POST' }),

    me: (): Promise<User> =>
      request<User>('/user/me'),
  },

  users: {
    getById: (id: number): Promise<User> =>
      request<User>(`/user/${id}`),

    update: (id: number, data: UpdateUserDto): Promise<User> =>
      request<User>(`/user/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    getAll: (): Promise<User[]> =>
      request<User[]>('/user/all'),
  },

  products: {
    getList: async (params: ProductParams = {}): Promise<PaginatedResponse<ProductWithInventory>> => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      const result = await request<PaginatedResponse<ProductWithInventory> | ProductWithInventory[]>(`/products/with-inventory/all${qs ? `?${qs}` : ''}`);
      if (Array.isArray(result)) {
        const page = params.page ?? 1;
        const limit = params.limit ?? result.length;
        return { data: result, total: result.length, page, limit, totalPages: 1, hasNext: false };
      }
      return result;
    },

    getWithInventory: (id: number): Promise<ProductWithInventory> =>
      request<ProductWithInventory>(`/products/${id}/with-inventory`),

    getMultipleWithInventory: (productIds: number[]): Promise<ProductWithInventory[]> =>
      request<ProductWithInventory[]>('/products/with-inventory/multiple', {
        method: 'POST',
        body: JSON.stringify({ productIds }),
      }),

    create: (data: CreateProductDto): Promise<Product> =>
      request<Product>('/products', { method: 'POST', body: JSON.stringify(data) }),

    getBrands: (): Promise<Brand[]> =>
      request<Brand[]>('/products/brands'),

    getCategories: (): Promise<Category[]> =>
      request<Category[]>('/products/categories'),

    update: (id: number, data: Partial<CreateProductDto>): Promise<Product> =>
      request<Product>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    delete: (id: number): Promise<void> =>
      request(`/products/${id}`, { method: 'DELETE' }),

    getBySku: (sku: string): Promise<Product> =>
      request<Product>(`/products/sku/${sku}`),

    search: (q: string): Promise<PaginatedResponse<Product>> => {
      const qs = toQuery({ search: q });
      return request<PaginatedResponse<Product>>(`/products/search${qs}`);
    },

    createBrand: (data: CreateBrandDto): Promise<Brand> =>
      request<Brand>('/products/brands', { method: 'POST', body: JSON.stringify(data) }),

    getBrandById: (id: number): Promise<Brand> =>
      request<Brand>(`/products/brands/${id}`),

    createCategory: (data: CreateCategoryDto): Promise<Category> =>
      request<Category>('/products/categories', { method: 'POST', body: JSON.stringify(data) }),

    getCategoryById: (id: number): Promise<Category> =>
      request<Category>(`/products/categories/${id}`),

    getByCategory: (categoryId: number, params: ProductParams = {}): Promise<PaginatedResponse<Product>> => {
      const qs = toQuery(params as Record<string, unknown>);
      return request<PaginatedResponse<Product>>(`/products/category/${categoryId}${qs}`);
    },

    getByBrand: (brandId: number, params: ProductParams = {}): Promise<PaginatedResponse<Product>> => {
      const qs = toQuery(params as Record<string, unknown>);
      return request<PaginatedResponse<Product>>(`/products/brand/${brandId}${qs}`);
    },

    checkStock: (id: number, quantity: number): Promise<{ available: boolean; availableStock: number }> => {
      const qs = toQuery({ quantity });
      return request<{ available: boolean; availableStock: number }>(`/products/${id}/stock-check${qs}`);
    },
  },

  orders: {
    create: (data: CreateOrderDto): Promise<Order> =>
      request<Order>('/order', { method: 'POST', body: JSON.stringify(data) }),

    getByUser: (userId: number, page = 1, limit = 10): Promise<PaginatedResponse<Order>> => {
      const qs = toQuery({ page, limit });
      return request<PaginatedResponse<Order>>(`/order/user/${userId}${qs}`);
    },

    getById: (id: number): Promise<Order> =>
      request<Order>(`/order/${id}`),

    getAdminOrders: (page = 1, limit = 20): Promise<PaginatedResponse<OrderWithBuyer>> => {
      const qs = toQuery({ page, limit });
      return request<PaginatedResponse<OrderWithBuyer>>(`/order/admin/orders${qs}`);
    },

    cancel: (id: number): Promise<Order> =>
      request<Order>(`/order/${id}/cancel`, { method: 'PATCH' }),

    getInvoice: (id: number): Promise<Blob> =>
      fetch(`${API_BASE}/order/${id}/invoice`, { credentials: 'include' }).then(res => {
        if (!res.ok) throw { status: res.status, message: res.statusText } as ApiError;
        return res.blob();
      }),

    getPaymentUrl: (id: number): Promise<{ order_url: string; status: string }> =>
      request<{ order_url: string; status: string }>(`/order/${id}/payment-url`),
  },

  payment: {
    getOptions: (): Promise<{ options: PaymentOption[] }> =>
      request<{ options: PaymentOption[] }>('/payment/options'),

    getResult: (params: Record<string, string>): Promise<PaymentResult> => {
      const qs = toQuery(params);
      return request<PaymentResult>(`/gateway/payment-result${qs}`);
    },
  },

  social: {
    createPost: (data: CreatePostDto): Promise<Post> =>
      request<Post>('/social/posts', { method: 'POST', body: JSON.stringify(data) }),

    getFeed: (page = 1, limit = 20): Promise<PaginatedResponse<Post>> => {
      const qs = toQuery({ page, limit });
      return request<PaginatedResponse<Post>>(`/social/posts${qs}`);
    },

    getPostsByUser: (userId: number, page = 1, limit = 20): Promise<PaginatedResponse<Post>> => {
      const qs = toQuery({ page, limit });
      return request<PaginatedResponse<Post>>(`/social/posts/user/${userId}${qs}`);
    },

    getPostById: (id: number): Promise<Post> =>
      request<Post>(`/social/posts/${id}`),

    likePost: (id: number): Promise<LikeResult> =>
      request<LikeResult>(`/social/posts/${id}/like`, { method: 'POST' }),

    unlikePost: (id: number): Promise<LikeResult> =>
      request<LikeResult>(`/social/posts/${id}/like`, { method: 'DELETE' }),

    deletePost: (id: number): Promise<unknown> =>
      request(`/social/posts/${id}`, { method: 'DELETE' }),

    createComment: (postId: number, data: CreateCommentDto): Promise<Comment> =>
      request<Comment>(`/social/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(data) }),

    getComments: (postId: number, page = 1, limit = 20): Promise<PaginatedResponse<Comment>> => {
      const qs = toQuery({ page, limit });
      return request<PaginatedResponse<Comment>>(`/social/posts/${postId}/comments${qs}`);
    },

    deleteComment: (id: number): Promise<unknown> =>
      request(`/social/comments/${id}`, { method: 'DELETE' }),

    createReply: (commentId: number, data: CreateReplyDto): Promise<Comment> =>
      request<Comment>(`/social/comments/${commentId}/replies`, { method: 'POST', body: JSON.stringify(data) }),

    getReplies: (commentId: number, depth?: number): Promise<CommentTree> => {
      const qs = depth !== undefined ? toQuery({ depth }) : '';
      return request<CommentTree>(`/social/comments/${commentId}/replies${qs}`);
    },

    followUser: (id: number): Promise<FollowResult> =>
      request<FollowResult>(`/social/users/${id}/follow`, { method: 'POST' }),

    unfollowUser: (id: number): Promise<FollowResult> =>
      request<FollowResult>(`/social/users/${id}/follow`, { method: 'DELETE' }),

    getFollowers: (id: number, page = 1, limit = 20): Promise<PaginatedResponse<FollowerItem>> => {
      const qs = toQuery({ page, limit });
      return request<PaginatedResponse<FollowerItem>>(`/social/users/${id}/followers${qs}`);
    },

    getFollowing: (id: number, page = 1, limit = 20): Promise<PaginatedResponse<FollowingItem>> => {
      const qs = toQuery({ page, limit });
      return request<PaginatedResponse<FollowingItem>>(`/social/users/${id}/following${qs}`);
    },

    getFollowingFeed: (id: number, page = 1, limit = 20): Promise<PaginatedResponse<Post>> => {
      const qs = toQuery({ page, limit });
      return request<PaginatedResponse<Post>>(`/social/users/${id}/feed${qs}`);
    },
  },

  notifications: {
    getList: (page = 1, limit = 20): Promise<PaginatedResponse<Notification>> => {
      const qs = toQuery({ page, limit });
      return request<PaginatedResponse<Notification>>(`/notifications${qs}`);
    },

    markRead: (id: number): Promise<{ success: boolean }> =>
      request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' }),
  },

  chat: {
    createConversation: (data: CreateConversationDto): Promise<Conversation> =>
      request<Conversation>('/chat/conversations', { method: 'POST', body: JSON.stringify(data) }),

    getConversations: (): Promise<Conversation[]> =>
      request<Conversation[]>('/chat/conversations'),

    getMessages: (conversationId: number, page = 1, limit = 50): Promise<PaginatedResponse<Message>> => {
      const qs = toQuery({ page, limit });
      return request<PaginatedResponse<Message>>(`/chat/conversations/${conversationId}/messages${qs}`);
    },
  },

  inventory: {
    create: (data: CreateInventoryDto): Promise<InventoryRecord> =>
      request<InventoryRecord>('/inventory', { method: 'POST', body: JSON.stringify(data) }),

    getAll: (): Promise<InventoryRecord[]> =>
      request<InventoryRecord[]>('/inventory'),

    getLowStock: (): Promise<InventoryRecord[]> =>
      request<InventoryRecord[]>('/inventory/low-stock'),

    getByProduct: (productId: number): Promise<InventoryRecord> =>
      request<InventoryRecord>(`/inventory/product/${productId}`),

    getBySku: (sku: string): Promise<InventoryRecord> =>
      request<InventoryRecord>(`/inventory/sku/${sku}`),

    getById: (id: number): Promise<InventoryRecord> =>
      request<InventoryRecord>(`/inventory/${id}`),

    update: (id: number, data: UpdateInventoryDto): Promise<InventoryRecord> =>
      request<InventoryRecord>(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    delete: (id: number): Promise<unknown> =>
      request(`/inventory/${id}`, { method: 'DELETE' }),

    checkStock: (productId: number, quantity: number): Promise<StockCheckResponse> =>
      request<StockCheckResponse>('/inventory/check-stock', { method: 'POST', body: JSON.stringify({ productId, quantity }) }),

    reserveStock: (productId: number, quantity: number): Promise<InventoryRecord> =>
      request<InventoryRecord>('/inventory/reserve-stock', { method: 'POST', body: JSON.stringify({ productId, quantity }) }),

    releaseStock: (productId: number, quantity: number): Promise<InventoryRecord> =>
      request<InventoryRecord>('/inventory/release-stock', { method: 'POST', body: JSON.stringify({ productId, quantity }) }),
  },

  upload: {
    getSignature: (folder: string, userId?: number, publicId?: string): Promise<UploadSignature> => {
      const qs = toQuery({ folder, userId, publicId });
      return request<UploadSignature>(`/upload/signature${qs}`, { method: 'POST' });
    },

    deleteMedia: (public_id: string): Promise<{ result: string }> =>
      request<{ result: string }>('/upload/media', {
        method: 'DELETE',
        body: JSON.stringify({ public_id }),
      }),
  },

  misc: {
    health: (): Promise<HealthStatus> =>
      request<HealthStatus>('/gateway/health'),
  },
};
