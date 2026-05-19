import type {
  User,
  Product,
  ProductWithInventory,
  Brand,
  Category,
  Order,
  ProductParams,
  LoginDto,
  RegisterDto,
  CreateOrderItemDto,
  CreateProductDto,
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
  return res.json() as Promise<T>;
}

export const api = {
  auth: {
    login: (data: LoginDto): Promise<User> =>
      request<User>('/user/login', { method: 'POST', body: JSON.stringify(data) }),

    register: (data: RegisterDto): Promise<User> =>
      request<User>('/user/register', { method: 'POST', body: JSON.stringify(data) }),

    logout: (): Promise<void> =>
      request('/user/logout', { method: 'POST' }),
  },

  products: {
    getList: (params: ProductParams = {}): Promise<unknown> => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request(`/products/with-inventory/all${qs ? `?${qs}` : ''}`);
    },

    getById: (id: number): Promise<Product> =>
      request<Product>(`/products/${id}`),

    getWithInventory: (id: number): Promise<ProductWithInventory> =>
      request<ProductWithInventory>(`/products/${id}/with-inventory`),

    getMultipleWithInventory: (productIds: number[]): Promise<ProductWithInventory[]> =>
      request<ProductWithInventory[]>('/products/with-inventory/multiple', {
        method: 'POST',
        body: JSON.stringify({ productIds }),
      }),

    create: (data: CreateProductDto): Promise<Product> =>
      request<Product>('/products', { method: 'POST', body: JSON.stringify(data) }),

    getBrands: async (): Promise<Brand[]> => {
      const res = await request<Brand[] | { data: Brand[] }>('/products/brands');
      return Array.isArray(res) ? res : (res.data ?? []);
    },

    getCategories: async (): Promise<Category[]> => {
      const res = await request<Category[] | { data: Category[] }>('/products/categories');
      return Array.isArray(res) ? res : (res.data ?? []);
    },
  },

  orders: {
    create: (items: CreateOrderItemDto[]): Promise<Order> =>
      request<Order>('/order', { method: 'POST', body: JSON.stringify({ items }) }),

    getByUser: (userId: number): Promise<Order[]> =>
      request<Order[]>(`/order/user/${userId}`),
  },
};
