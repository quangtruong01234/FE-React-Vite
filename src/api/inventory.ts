import type {
  InventoryRecord,
  CreateInventoryDto,
  UpdateInventoryDto,
} from '@/types';
import { request } from './client';

// Backend removed the unbounded/duplicate inventory routes in the 2026-07-06
// unused-API sweep (getAll / getBySku / getById / delete / checkStock /
// reserveStock / releaseStock). Only the three live routes below remain, plus
// the now-hardened role-scoped low-stock endpoint. Stock checks go through
// `productsApi.checkStock` (`GET /products/:id/stock-check`).
export const inventoryApi = {
  create: (data: CreateInventoryDto): Promise<InventoryRecord> =>
    request<InventoryRecord>('/inventory', { method: 'POST', body: JSON.stringify(data) }),

  getLowStock: (): Promise<InventoryRecord[]> =>
    request<InventoryRecord[]>('/inventory/low-stock'),

  getByProduct: (productId: string): Promise<InventoryRecord> =>
    request<InventoryRecord>(`/inventory/product/${productId}`),

  update: (id: number, data: UpdateInventoryDto): Promise<InventoryRecord> =>
    request<InventoryRecord>(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};
