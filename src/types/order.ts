import type { PaymentMethod } from "./payment";
import type { UserSummary } from "./user";

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
  // OVERFETCH-01: `previousOrderStatus` is a server-side restore handle for a
  // rejected request — the order's own `status` is what the UI reads.
  refundAmount: number | null;
  refundMethod: PaymentMethod | null;
  refundStatus: RefundStatus | null;
  reviewedBy: string | null;
  /**
   * `reviewedBy` hydrated to a display summary (OVERFETCH-01 §7) — absent while
   * the request is still `pending_review`, and on responses served before the
   * backend rollout.
   */
  reviewer?: UserSummary | null;
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

/**
 * Whose subtotal the voucher's thresholds are measured against. `platform`
 * (`sellerId: null`) prices on the whole goods subtotal; `shop` prices on that
 * seller's slice of the basket **only** — so `minOrderAmount`, `amountToAdd`,
 * `maxDiscountAmount` and `discountAmount` on a shop voucher are all about the
 * slice, never the cart total. Label it in the UI or "cần thêm 300k" reads as a
 * lie on a 500k basket split across two shops.
 */
export type VoucherScope = "platform" | "shop";

/**
 * Why `vouchers/available` says a code cannot be used right now. Stable machine
 * strings — the backend deliberately sends no prose, so the Vietnamese copy
 * lives in `features/cart/voucherSuggestions.ts`. Typed as a union plus
 * `string` so a reason added server-side degrades to the generic copy instead
 * of failing to compile.
 */
export type VoucherIneligibleReason =
  | "INACTIVE"
  | "WRONG_SELLER"
  | "NOT_ACTIVE_YET"
  | "EXPIRED"
  | "MIN_ORDER_NOT_MET"
  | "FULLY_REDEEMED"
  | "USER_LIMIT_REACHED"
  | "NO_DISCOUNT";

/** `POST /order/vouchers/available` — same item shape as `voucher/validate`. */
export interface AvailableVouchersDto {
  items: CreateOrderItemDto[];
}

/**
 * One row of `POST /order/vouchers/available`: a voucher already priced against
 * the basket that was sent. Money fields are DECIMAL columns server-side, so
 * they can arrive as `"50000.00"` — coerce with `toVoucherNumber` before math.
 */
export interface AvailableVoucher {
  code: string;
  description: string | null;
  discountType: VoucherDiscountType;
  discountValue: number | string;
  minOrderAmount: number | string;
  maxDiscountAmount: number | string | null;
  /** `usr_…` on a shop voucher, `null` on a platform one — never a number. */
  sellerId: string | null;
  scope: VoucherScope;
  isEligible: boolean;
  /** `null` when eligible. */
  ineligibleReason: VoucherIneligibleReason | string | null;
  /** How much more to spend before this code applies; `0` when eligible. */
  amountToAdd: number | string;
  /** What this code would take off right now — sort by it to rank the list. */
  discountAmount: number | string;
  /** The slice the discount was measured against (see `VoucherScope`). */
  applicableSubtotal: number | string;
}

/**
 * The list is a **hint, not a permission**: applying a code the list called
 * eligible can still fail (`400` from `voucher/validate` / `POST /order`, or
 * `409 JUST_FULLY_REDEEMED` when someone else claims the last slot in between —
 * the list reads the DB counter and cannot see in-flight Redis claims). Never
 * skip the validate/apply round-trip because a row said `isEligible`.
 */
export interface AvailableVouchersResponse {
  /** Goods subtotal re-priced from the catalog — reconcile against cart maths. */
  itemsTotal: number | string;
  /** Capped at 50 rows server-side. */
  vouchers: AvailableVoucher[];
}

/**
 * A voucher row from the admin console (`GET /order/admin/vouchers`). Money
 * fields are DECIMAL columns, so TypeORM can serialize them as strings
 * ("50000.00") — always `Number()` before doing arithmetic.
 *
 * `id` is a plain auto-increment integer: vouchers were never migrated to the
 * `xxx_`-prefixed public ids, so the deactivate/update routes take the numeric id.
 */
export interface Voucher {
  id: number;
  code: string;
  description: string | null;
  discountType: VoucherDiscountType;
  /** percent: 1–100 (%) · fixed: VND amount. */
  discountValue: number | string;
  minOrderAmount: number | string;
  /** Cap on a percent discount (VND). `null` = uncapped. */
  maxDiscountAmount: number | string | null;
  /** Total redemptions allowed across all users. `null` = unlimited. */
  usageLimit: number | null;
  usedCount: number;
  /** Redemptions allowed per user. `null` = unlimited. */
  perUserLimit: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  /**
   * Owner of a shop voucher (`usr_…`), `null` for a platform-wide one. Optional
   * because a backend without VOUCHER-SHOP-01 omits the key entirely; treat
   * absent and `null` the same. Not editable — a voucher never changes owner.
   */
  sellerId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * `POST /order/admin/vouchers` — admin only. Optional fields must be **omitted**
 * rather than sent as `null`: the backend reads a missing key as "unlimited" /
 * "no window", while `null` fails class-validator and comes back 400.
 */
export interface CreateVoucherDto {
  code: string;
  description?: string;
  discountType: VoucherDiscountType;
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  perUserLimit?: number;
  /** ISO-8601 */
  startsAt?: string;
  /** ISO-8601 */
  expiresAt?: string;
  isActive?: boolean;
}

/**
 * `PATCH /order/admin/vouchers/:id` (VOUCHER-EDIT-01) — a **partial**, and the
 * two "empty" values mean opposite things: **omit** a key to leave the field
 * untouched, send `null` to clear it (uncapped / unlimited / no window / no
 * description). `{}` is accepted and changes nothing.
 *
 * `code`, `discountType`, `discountValue` and `sellerId` are absent on purpose —
 * they are immutable, and sending one is a `400 "property … should not exist"`
 * rather than a silent no-op. Orders already priced against a voucher cannot be
 * re-priced, so changing the money is deliberately deactivate-and-reissue.
 *
 * `{ isActive: true }` is also the **reactivate** route; there is no separate
 * endpoint. Once `usedCount > 0` the voucher can only be **loosened** — a
 * tightening edit is a `400`, and a loosening one cannot be walked back through
 * the API (the reverse would be a tightening), so confirm before widening.
 */
export interface UpdateVoucherDto {
  description?: string | null;
  /**
   * The one optional amount that is **not** nullable: the column is `NOT NULL
   * DEFAULT 0`, the DTO declares `minOrderAmount?: number`, and the service
   * calls `.toFixed(2)` on whatever arrives. `@IsOptional()` skips validation
   * for `null` as well as `undefined`, so a `null` sails past the pipe and
   * crashes the handler with a **500**, not a 400. "No minimum" is `0` here.
   */
  minOrderAmount?: number;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  /** ISO-8601, or `null` to clear the window end/start. */
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive?: boolean;
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
