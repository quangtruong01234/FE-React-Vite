import type { PaymentMethod } from "./payment";

// --- Order ---

export interface OrderItem {
  id: number;
  productId: string | null;
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
  id: string;
  orderId: string;
  userId: string;
  reason: string;
  status: ReturnRequestStatus;
  rejectReason: string | null;
  previousOrderStatus: OrderStatus;
  refundAmount: number | null;
  refundMethod: PaymentMethod | null;
  refundStatus: RefundStatus | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  userId: string;
  sellerId?: string;
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
  /** Line subtotal (Σ item price×qty), server-computed as a number. Optional for legacy/multi-seller responses that predate the field. */
  subtotal?: number;
  /** Shipping fee, server-normalized to a non-null number (0 for legacy fee-less orders). Optional for legacy/multi-seller responses that predate the field. `total = subtotal − discountAmount + shippingFee`. */
  shippingFee?: number;
  /**
   * ISO-8601 timestamp of when money was actually collected, `null` when none
   * has been. Semantics differ by method: on vnpay/zalopay `null` means the
   * buyer never completed checkout; on COD it stays null until delivery, so it
   * means "chưa giao", not "chưa trả tiền". Optional so a response that predates
   * the field (ORD-GUARD-01) still type-checks.
   */
  paidAt?: string | null;
  createdAt: string;
  items: OrderItem[];
}

export interface OrderWithBuyer extends Order {
  buyer: {
    id: string;
    username: string;
    email: string;
    name?: string;
  };
}

/** Item as returned by the seller order detail endpoint, enriched by the gateway. */
export interface SellerOrderItemDetail extends OrderItem {
  sellerId?: string;
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

/**
 * `GET /api/order/seller` — list rows carry decorated items too (ORDER-SHAPE-01;
 * they used to be `[]` on every row because the query did not join). The card
 * renders name/image/quantity straight from the list, no per-order detail call.
 */
export interface SellerOrderListRow extends OrderWithBuyer {
  items: SellerOrderItemDetail[];
}

export interface CreateOrderItemDto {
  productId: string;
  productName: string;
  quantity: number;
  skuId?: number;
}

/**
 * GHN-ADDR-01: the exact GHN location, so the waybill and the fee resolve from
 * real ids instead of GHN guessing them out of the free-text `shippingAddress`.
 * All-or-nothing server-side — a half pair is ignored and silently falls back
 * to free-text resolution. Build it with `ghnLocationIds()`.
 */
export interface GhnLocationDto {
  /** GHN `DistrictID` (integer ≥ 1) from `GET /shipping/districts`. */
  toDistrictId?: number;
  /**
   * GHN `WardCode` from `GET /shipping/wards`. Stays a string — codes can carry
   * a leading zero ("13010") that a numeric round-trip would destroy.
   */
  toWardCode?: string;
}

export interface CreateOrderDto extends GhnLocationDto {
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

export interface ShippingFeeDto extends GhnLocationDto {
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
  /** IDLEAK-02: `prod_…`, or `null` once the product is deleted. Not read by the dashboard (charts key on `productName`). */
  productId: string | null;
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
