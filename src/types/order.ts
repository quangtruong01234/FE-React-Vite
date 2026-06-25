import type { PaymentMethod } from './payment';

// --- Order ---

export interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  price: number;
  /** Product name, server-enriched on every order endpoint (no client hydration needed). */
  productName?: string;
  /** SKU chosen at purchase time, or null when the product has no variations. */
  skuId?: number | null;
  /** Human-readable SKU label e.g. "Màu sắc: Đỏ, Size: M", or null. Server-enriched. */
  skuLabel?: string | null;
  /** First product image (realtime), or null when the product has none / was deleted. Server-enriched. */
  image?: string | null;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivering' | 'completed' | 'canceled';

/** `GET /api/order/user/:id/status-counts` — full-history order count per status (not page-scoped). */
export interface OrderStatusCounts {
  all: number;
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivering: number;
  completed: number;
  canceled: number;
}

export interface Order {
  id: number;
  userId: number;
  total: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  shippingAddress: string;
  codAmount: number | null;
  ghnOrderCode: string | null;
  createdAt: string;
  items: OrderItem[];
}

export interface OrderWithBuyer extends Order {
  buyer: {
    id: number;
    username: string;
    email: string;
    name?: string;
  };
}

/** Item as returned by the seller order detail endpoint, enriched by the gateway. */
export interface SellerOrderItemDetail extends OrderItem {
  sellerId?: number;
  skuTierIdx?: string | null;
  /** First product image, or null when the product has none. */
  image: string | null;
  /** Human-readable SKU label e.g. "Màu sắc: Đỏ, Size: M", or null. */
  skuLabel: string | null;
}

/** `GET /api/order/seller/:id` — the order plus per-item product image + SKU label. */
export interface SellerOrderDetail extends Order {
  items: SellerOrderItemDetail[];
}

export interface CreateOrderItemDto {
  productId: number;
  productName: string;
  quantity: number;
  skuId?: number;
}

export interface CreateOrderDto {
  paymentMethod: PaymentMethod;
  shippingAddress: string;
  items: CreateOrderItemDto[];
}

/** Multi-seller checkout: gateway splits the cart into N orders and pre-initiates one payment covering all of them. */
export interface MultiSellerOrderResponse {
  orders: Order[];
  paymentUrl: string | null;
}

export type CreateOrderResponse = Order | MultiSellerOrderResponse;

// --- Shipping ---

export interface ShippingFeeItemDto {
  productName?: string;
  quantity: number;
  price?: number;
  weight?: number;
}

export interface ShippingFeeDto {
  /** Pipe-delimited for GHN: "name|phone|address|ward|district|province" */
  shippingAddress: string;
  items: ShippingFeeItemDto[];
}

export interface ShippingFeeResponse {
  shippingFee: number;
  expectedDeliveryTime: string | null;
}
