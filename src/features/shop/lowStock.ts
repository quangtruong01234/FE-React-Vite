import type { InventoryRecord } from '@/types';

export interface LowStockRow {
  id: number;
  productId: number;
  name: string;
  sku: string;
  availableStock: number;
  minimumStock: number;
}

/**
 * Shape the role-scoped `GET /inventory/low-stock` records for the dashboard panel.
 * The backend denormalizes `productName` onto each row (2026-07-10 handoff); it is
 * null only for orphaned rows (product deleted) — fall back to the SKU then. Rows
 * stay ordered availableStock-ASC as the backend returns them. `id`/`productId`
 * are bigint columns the backend may serialize as strings, so both are coerced.
 */
export function buildLowStockRows(records: InventoryRecord[]): LowStockRow[] {
  return records.map((r) => ({
    id: Number(r.id),
    productId: Number(r.productId),
    name: r.productName ?? r.sku,
    sku: r.sku,
    availableStock: r.availableStock,
    minimumStock: r.minimumStock ?? 0,
  }));
}
