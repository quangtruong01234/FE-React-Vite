import type {
  User,
  Product,
  ProductWithInventory,
  PaginatedResponse,
  Brand,
  Category,
  Order,
  ProductParams,
  LoginDto,
  RegisterDto,
  CreateOrderDto,
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
  const json = await res.json() as T | { data: T };
  if (json !== null && typeof json === 'object' && 'data' in json && !Array.isArray(json)) {
    return (json as { data: T }).data;
  }
  return json as T;
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
    getList: (params: ProductParams = {}): Promise<PaginatedResponse<ProductWithInventory>> => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<PaginatedResponse<ProductWithInventory>>(`/products/with-inventory/all${qs ? `?${qs}` : ''}`);
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
  },

  orders: {
    create: (data: CreateOrderDto): Promise<Order> =>
      request<Order>('/order', { method: 'POST', body: JSON.stringify(data) }),

    getByUser: (userId: number): Promise<PaginatedResponse<Order>> =>
      request<PaginatedResponse<Order>>(`/order/user/${userId}`),
  },
};
