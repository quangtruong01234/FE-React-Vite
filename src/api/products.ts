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
  UpdateProductDto,
  CreateBrandDto,
  CreateCategoryDto,
  WishlistItem,
  WishlistToggleResult,
  RiskProduct,
  ProductRescoreResult,
  ProductRiskParams,
  RiskBackfillParams,
  RiskBackfillResult,
  RiskFeedbackDto,
  RiskFeedbackRecord,
  DuplicateCheckResult,
  PriceSuggestion,
  PriceSuggestionParams,
} from '@/types';
import { request, toQuery } from './client';
import { fetchBatchTolerant } from '@/lib/http/fetchBatchTolerant';
import chunk from 'lodash/chunk';

// Gateway DTO whitelist only knows the plural array keys `categoryIds`/`brandIds`,
// repeated once per value (`?categoryIds=16&categoryIds=18`); singular or `[]` keys
// are silently stripped → unfiltered results. See backend handoff 2026-07-03.
// Province filter uses the SINGULAR repeated key `provinceId` (`?provinceId=201&provinceId=299`);
// bracket syntax `provinceId[]` is stripped by the gateway. See backend handoff 2026-07-16.
export function buildProductListQuery(params: ProductParams): string {
  const { categoryIds, brandIds, provinceIds, ...rest } = params;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined && v !== null && v !== '') sp.append(k, String(v));
  }
  for (const id of categoryIds ?? []) sp.append('categoryIds', String(id));
  for (const id of brandIds ?? []) sp.append('brandIds', String(id));
  for (const id of provinceIds ?? []) sp.append('provinceId', String(id));
  return sp.toString();
}

// `POST /products/with-inventory/multiple` validates its body (SEC-H2, 2026-07-09):
// max 50 ids per request, 400 over the limit. Dedupe (server dedupes anyway, so
// duplicates only waste the 50-slot budget) and chunk so any id set stays valid.
export const MAX_BATCH_PRODUCT_IDS = 50;

export function batchProductIds(productIds: string[]): string[][] {
  return chunk([...new Set(productIds)], MAX_BATCH_PRODUCT_IDS);
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

  getWithInventory: (id: string): Promise<ProductWithInventory> =>
    request<ProductWithInventory>(`/products/${id}/with-inventory`),

  // P2-06 (resolved): backend now skips missing ids and returns partial array;
  // fetchBatchTolerant kept as safety net — fan-out only triggers on 404 which no longer happens.
  // SEC-H2 (2026-07-09): backend rejects batches >50 ids with 400 — batchProductIds
  // dedupes and chunks so an oversized cart hydration can't 400 the whole batch.
  getMultipleWithInventory: async (productIds: string[]): Promise<ProductWithInventory[]> => {
    const batches = await Promise.all(
      batchProductIds(productIds).map((batch) =>
        fetchBatchTolerant(
          batch,
          (ids) => request<ProductWithInventory[]>('/products/with-inventory/multiple', {
            method: 'POST',
            body: JSON.stringify({ productIds: ids }),
          }),
          (id) => request<ProductWithInventory>(`/products/${id}/with-inventory`),
        ),
      ),
    );
    return batches.flat();
  },

  getShopStats: (): Promise<{ productCount: number; totalStock: number; lowStockCount: number }> =>
    request('/products/shop/stats'),

  create: (data: CreateProductDto): Promise<Product> =>
    request<Product>('/products', { method: 'POST', body: JSON.stringify(data) }),

  getBrands: (): Promise<Brand[]> =>
    request<Brand[]>('/products/brands'),

  getCategories: (): Promise<Category[]> =>
    request<Category[]>('/products/categories'),

  update: (id: string, data: UpdateProductDto): Promise<Product> =>
    request<Product>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string): Promise<void> =>
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
    const qs = toQuery({ ...params });
    return request<PaginatedResponse<Product>>(`/products/category/${categoryId}${qs}`);
  },

  getByBrand: (brandId: number, params: ProductParams = {}): Promise<PaginatedResponse<Product>> => {
    const qs = toQuery({ ...params });
    return request<PaginatedResponse<Product>>(`/products/brand/${brandId}${qs}`);
  },

  checkStock: (id: string, quantity: number): Promise<{ available: boolean; availableStock: number }> => {
    const qs = toQuery({ quantity });
    return request<{ available: boolean; availableStock: number }>(`/products/${id}/stock-check${qs}`);
  },

  // --- Catalog price suggestion (AI-01) — advisory, seller product form ---

  getPriceSuggestion: (params: PriceSuggestionParams): Promise<PriceSuggestion> => {
    const qs = toQuery({ ...params });
    return request<PriceSuggestion>(`/products/price-suggestion${qs}`);
  },

  // --- Admin product risk queue (AI-02) — advisory scoring, admin-only ---

  getAdminRisk: (params: ProductRiskParams = {}): Promise<PaginatedResponse<RiskProduct>> => {
    const qs = toQuery(params as Record<string, unknown>);
    return request<PaginatedResponse<RiskProduct>>(`/products/admin/risk${qs}`);
  },

  rescoreRisk: (productId: string): Promise<ProductRescoreResult> =>
    request<ProductRescoreResult>(`/products/admin/risk/${productId}/rescore`, { method: 'POST' }),

  // Cursor-resumable legacy scoring (AI-02F2) — 202, work happens async in the queue.
  backfillRisk: (params: RiskBackfillParams = {}): Promise<RiskBackfillResult> =>
    request<RiskBackfillResult>('/products/admin/risk/backfill', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // Duplicate-review audit feedback (AI-02F4) — advisory record, never unlists.
  sendRiskFeedback: (productId: string, data: RiskFeedbackDto): Promise<RiskFeedbackRecord> =>
    request<RiskFeedbackRecord>(`/products/admin/risk/${productId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Seller pre-publish duplicate advisory (AI-02F3). The imageUrl must be a
  // Cloudinary asset the caller uploaded (foreign URL → 403); rate limit 10/min.
  checkRiskDuplicate: (imageUrl: string): Promise<DuplicateCheckResult> =>
    request<DuplicateCheckResult>('/products/risk/duplicate-check', {
      method: 'POST',
      body: JSON.stringify({ imageUrl }),
    }),

  // --- Wishlist / favorites (F6) ---

  getWishlist: async (params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<WishlistItem>> => {
    const qs = toQuery(params as Record<string, unknown>);
    const result = await request<PaginatedResponse<WishlistItem> | WishlistItem[]>(`/products/wishlist${qs}`);
    if (Array.isArray(result)) {
      const page = params.page ?? 1;
      const limit = params.limit ?? result.length;
      return { data: result, total: result.length, page, limit, totalPages: 1, hasNext: false };
    }
    return result;
  },

  // Both mutations are idempotent server-side (add returns success on duplicate,
  // remove returns 204 even if not currently wishlisted) — safe for optimistic UI.
  addWishlist: (productId: string): Promise<WishlistToggleResult> =>
    request<WishlistToggleResult>(`/products/wishlist/${productId}`, { method: 'POST' }),

  removeWishlist: (productId: string): Promise<void> =>
    request(`/products/wishlist/${productId}`, { method: 'DELETE' }),
};
