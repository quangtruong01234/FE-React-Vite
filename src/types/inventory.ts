// --- Inventory ---

export interface Inventory {
  availableStock: number;
  reservedStock: number;
  totalStock: number;
  isLowStock: boolean;
}

export interface InventoryRecord {
  id: number;
  productId: number;
  sku: string;
  availableStock: number;
  reservedStock?: number;
  minimumStock?: number;
  location?: string;
  isLowStock: boolean;
}

export interface CreateInventoryDto {
  productId: number;
  sku: string;
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
  productId: number;
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
