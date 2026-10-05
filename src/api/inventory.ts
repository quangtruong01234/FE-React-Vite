import type {
  InventoryRecord,
  CreateInventoryDto,
  UpdateInventoryDto,
} from '@/types';
import { request } from './client';

// Backend removed the unbounded/duplicate inventory routes in the 2026-07-06
// unused-API sweep (getAll / getBySku / getById / delete / checkStock /
// reserveStock / releaseStock). Only the two live routes below remain, plus
// the now-hardened role-scoped low-stock endpoint. Stock checks go through
// `productsApi.checkStock` (`GET /products/:id/stock-check`).
// `GET /inventory/product/:productId` still exists but returns only the base
// (no-SKU) row, so it 404s for every variant product; nothing here calls it.
export const inventoryApi = {
  create: (data: CreateInventoryDto): Promise<InventoryRecord> =>
    request<InventoryRecord>('/inventory', { method: 'POST', body: JSON.stringify(data) }),

  getLowStock: (): Promise<InventoryRecord[]> =>
    request<InventoryRecord[]>('/inventory/low-stock'),

  update: (id: number, data: UpdateInventoryDto): Promise<InventoryRecord> =>
    request<InventoryRecord>(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};
