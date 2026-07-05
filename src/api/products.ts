import type {
  Product,
  ProductWithInventory,
  PaginatedResponse,
  Brand,
  PendingBrand,
  Category,
  PendingCategory,
  ReviewDto,
  ProductParams,
  CreateProductDto,
  CreateBrandDto,
  CreateCategoryDto,
} from '@/types';
import { request, toQuery } from './client';
import { fetchBatchTolerant } from '@/lib/http/fetchBatchTolerant';

// Gateway DTO whitelist only knows the plural array keys `categoryIds`/`brandIds`,
// repeated once per value (`?categoryIds=16&categoryIds=18`); singular or `[]` keys
// are silently stripped → unfiltered results. See backend handoff 2026-07-03.
export function buildProductListQuery(params: ProductParams): string {
  const { categoryIds, brandIds, ...rest } = params;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined && v !== null && v !== '') sp.append(k, String(v));
  }
  for (const id of categoryIds ?? []) sp.append('categoryIds', String(id));
  for (const id of brandIds ?? []) sp.append('brandIds', String(id));
  return sp.toString();
}

export const productsApi = {
  getList: async (params: ProductParams = {}): Promise<PaginatedResponse<ProductWithInventory>> => {
    const qs = buildProductListQuery(params);
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

  // P2-06 (resolved): backend now skips missing ids and returns partial array;
  // fetchBatchTolerant kept as safety net — fan-out only triggers on 404 which no longer happens.
  getMultipleWithInventory: (productIds: number[]): Promise<ProductWithInventory[]> =>
    fetchBatchTolerant(
      productIds,
      (ids) => request<ProductWithInventory[]>('/products/with-inventory/multiple', {
        method: 'POST',
        body: JSON.stringify({ productIds: ids }),
      }),
      (id) => request<ProductWithInventory>(`/products/${id}/with-inventory`),
    ),

  getShopStats: (): Promise<{ productCount: number; totalStock: number; lowStockCount: number }> =>
    request('/products/shop/stats'),

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

  getPendingBrands: (): Promise<PendingBrand[]> =>
    request<PendingBrand[]>('/products/brands/pending'),

  reviewBrand: (id: number, data: ReviewDto): Promise<Brand> =>
    request<Brand>(`/products/brands/${id}/review`, { method: 'PATCH', body: JSON.stringify(data) }),

  getPendingCategories: (): Promise<PendingCategory[]> =>
    request<PendingCategory[]>('/products/categories/pending'),

  reviewCategory: (id: number, data: ReviewDto): Promise<Category> =>
    request<Category>(`/products/categories/${id}/review`, { method: 'PATCH', body: JSON.stringify(data) }),

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
};
