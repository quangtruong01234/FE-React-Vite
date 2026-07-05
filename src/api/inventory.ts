import type {
  InventoryRecord,
  CreateInventoryDto,
  UpdateInventoryDto,
  StockCheckResponse,
} from '@/types';
import { request } from './client';

export const inventoryApi = {
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
};
