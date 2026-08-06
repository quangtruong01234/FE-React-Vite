// --- Inventory ---

export interface Inventory {
  availableStock: number;
  reservedStock: number;
  totalStock: number;
  isLowStock: boolean;
}

export interface InventoryRecord {
  id: number;
  productId: string;
  sku: string;
  availableStock: number;
  reservedStock?: number;
  minimumStock?: number;
  location?: string;
  isLowStock: boolean;
  /** Denormalized on `GET /inventory/low-stock` only; null when the product was deleted. */
  productName?: string | null;
}

export interface CreateInventoryDto {
  productId: string;
  /** Optional, mirroring `CreateProductDto.sku` — omit and the backend provisions
   *  the `PROD-<productId>` fallback (verified 2026-07-22 with the sku-optional
   *  create flow: blank SKU → `inventory.sku: "PROD-60"`). */
  sku?: string;
  availableStock: number;
  minimumStock?: number;
  location?: string;
  isActive?: boolean;
}

export interface UpdateInventoryDto {
  sku?: string;
  availableStock?: number;
  minimumStock?: number;
  location?: string;
}

export interface StockCheckRequest {
  productId: string;
  quantity: number;
}

export interface StockCheckResponse {
  available: boolean;
  availableStock: number;
}

export interface StockCheckResult {
  available: boolean;
  availableStock: number;
}
