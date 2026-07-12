import type { PaymentMethod } from "./payment";

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
  /** First product image, purchase-time snapshot (P2-02) — stable even if the product is later edited/deleted; null when the product had none. Server-enriched. */
  image?: string | null;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivering"
  | "completed"
  | "canceled"
  | "return_requested"
  | "refunded";

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
  /** F2 return statuses — optional until the counts endpoint confirms it returns them. */
  return_requested?: number;
  refunded?: number;
}

// --- Return / refund (F2) ---

export type ReturnRequestStatus = "pending_review" | "approved" | "rejected";

/** Recorded refund outcome: online methods settle instantly, COD is settled manually by an operator. */
export type RefundStatus = "refunded" | "manual_pending";

export interface ReturnRequest {
  id: number;
  orderId: number;
  /** bigint column — may arrive as a numeric string. */
  userId: number | string;
  reason: string;
  status: ReturnRequestStatus;
  rejectReason: string | null;
  previousOrderStatus: OrderStatus;
  refundAmount: number | null;
  refundMethod: PaymentMethod | null;
  refundStatus: RefundStatus | null;
  /** bigint column — may arrive as a numeric string. */
  reviewedBy: number | string | null;
  createdAt: string;
  updatedAt: string;
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
  /** F3 voucher redeemed at checkout, or null/absent. `total` is already net of the discount. */
  voucherCode?: string | null;
  /** Decimal column — may arrive as a string ("50000.00") on older responses. */
  discountAmount?: number | string | null;
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
  /** First product image, purchase-time snapshot (P2-02) — stable even if the product is later edited/deleted; null when the product had none. */
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
  /** F3: optional voucher — single-seller baskets only (multi-seller + code → 400). */
  voucherCode?: string;
}

// --- Voucher (F3) ---

export type VoucherDiscountType = "percent" | "fixed";

/** `POST /api/order/voucher/validate` — previews a code against the basket; does NOT redeem. */
export interface VoucherValidateDto {
  code: string;
  items: CreateOrderItemDto[];
}

export interface VoucherValidation {
  code: string;
  discountType: VoucherDiscountType;
  discountAmount: number;
  itemsTotal: number;
  finalItemsTotal: number;
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

// --- Analytics (F4) ---

export interface AnalyticsQueryParams {
  from?: string;
  to?: string;
  interval?: "day" | "month";
  topN?: number;
}

export interface RevenuePoint {
  period: string;
  revenue: number;
  orderCount: number;
}

export interface TopProductStat {
  productId: number;
  productName: string;
  quantitySold: number;
  revenue: number;
}

export interface OrderAnalyticsSummary {
  totalRevenue: number;
  completedOrders: number;
  totalOrders: number;
  averageOrderValue: number;
}

/** `GET /api/order/seller/analytics` (scope `seller`) or `/api/order/admin/analytics` (scope `global`). */
export interface OrderAnalytics {
  scope: "seller" | "global";
  from: string;
  to: string;
  interval: "day" | "month";
  summary: OrderAnalyticsSummary;
  revenueOverTime: RevenuePoint[];
  statusDistribution: Record<OrderStatus, number>;
  topProducts: TopProductStat[];
}
