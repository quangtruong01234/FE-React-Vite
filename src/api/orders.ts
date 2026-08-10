import type {
  Order,
  OrderWithBuyer,
  OrderStatus,
  OrderStatusCounts,
  SellerOrderDetail,
  CreateOrderDto,
  CreateOrderResponse,
  ReturnRequest,
  ReturnRequestStatus,
  VoucherValidateDto,
  VoucherValidation,
  ShippingFeeDto,
  ShippingFeeResponse,
  AnalyticsQueryParams,
  OrderAnalytics,
  PaginatedResponse,
  ApiError,
} from "@/types";
import { request, toQuery, API_BASE } from "./client";

// `GET /order/user/:id?status=` (handoff 2026-08-07) takes the filter as REPEATED
// singular `status` keys — `?status=return_requested&status=refunded`. Bracket
// syntax `status[]=` is stripped by the Express simple query parser and yields
// `400`, same trap as `provinceId` on the product list. An empty list must emit
// no key at all: `?status=` is not "unfiltered", it is an invalid value.
export function buildUserOrdersQuery(
  page: number,
  limit: number,
  statuses: readonly OrderStatus[] = [],
): string {
  const sp = new URLSearchParams({ page: String(page), limit: String(limit) });
  for (const status of statuses) sp.append("status", status);
  return `?${sp.toString()}`;
}

export const ordersApi = {
  // P0-04: an optional Idempotency-Key lets the backend single-flight a
  // double-submit (409 while in-flight) and replay the cached order/payment
  // on a post-completion retry, so a network hiccup can never create a
  // duplicate order. Omitting it preserves the legacy non-idempotent create.
  create: (
    data: CreateOrderDto,
    idempotencyKey?: string,
  ): Promise<CreateOrderResponse> =>
    request<CreateOrderResponse>("/order", {
      method: "POST",
      body: JSON.stringify(data),
      headers: idempotencyKey
        ? { "Idempotency-Key": idempotencyKey }
        : undefined,
    }),

  getShippingFee: (data: ShippingFeeDto): Promise<ShippingFeeResponse> =>
    request<ShippingFeeResponse>("/order/shipping-fee", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // F3: preview a voucher code against the current basket without redeeming it.
  // 404 unknown/inactive code; 400 not-started/expired/min-order/usage-limit.
  validateVoucher: (data: VoucherValidateDto): Promise<VoucherValidation> =>
    request<VoucherValidation>("/order/voucher/validate", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getByUser: (
    userId: string,
    page = 1,
    limit = 10,
    statuses: readonly OrderStatus[] = [],
  ): Promise<PaginatedResponse<Order>> =>
    request<PaginatedResponse<Order>>(
      `/order/user/${userId}${buildUserOrdersQuery(page, limit, statuses)}`,
    ),

  getById: (id: string): Promise<Order> => request<Order>(`/order/${id}`),

  // P1-02: full-history per-status counts, so filter badges reflect the whole
  // history rather than only the pages loaded so far.
  getStatusCounts: (userId: string): Promise<OrderStatusCounts> =>
    request<OrderStatusCounts>(`/order/user/${userId}/status-counts`),

  getAdminOrders: (
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<OrderWithBuyer>> => {
    const qs = toQuery({ page, limit });
    return request<PaginatedResponse<OrderWithBuyer>>(
      `/order/admin/orders${qs}`,
    );
  },

  cancel: (id: string): Promise<Order> =>
    request<Order>(`/order/${id}/cancel`, { method: "PATCH" }),

  getInvoice: (id: string): Promise<Blob> =>
    fetch(`${API_BASE}/order/${id}/invoice`, { credentials: "include" }).then(
      (res) => {
        if (!res.ok)
          throw {
            statusCode: res.status,
            status: res.status,
            message: res.statusText,
          } as ApiError;
        return res.blob();
      },
    ),

  getPaymentUrl: (
    id: string,
  ): Promise<{ orderUrl: string | null; status: string | null }> =>
    request<{ orderUrl: string | null; status: string | null }>(
      `/order/${id}/payment-url`,
    ),

  getSellerOrders: (
    page = 1,
    limit = 20,
    status?: string,
  ): Promise<PaginatedResponse<OrderWithBuyer>> => {
    const qs = toQuery({ page, limit, status });
    return request<PaginatedResponse<OrderWithBuyer>>(`/order/seller${qs}`);
  },

  confirmOrder: (id: string): Promise<Order> =>
    request<Order>(`/order/${id}/confirm`, { method: "PATCH" }),

  readyToShip: (id: string): Promise<Order> =>
    request<Order>(`/order/${id}/ready-to-ship`, { method: "PATCH" }),

  // P1-01: seller order detail with items enriched (image + SKU label).
  getSellerOrderDetail: (id: string): Promise<SellerOrderDetail> =>
    request<SellerOrderDetail>(`/order/seller/${id}`),

  // P1-01: forward lifecycle transitions after `processing` (single-step).
  ship: (id: string): Promise<Order> =>
    request<Order>(`/order/${id}/ship`, { method: "PATCH" }),

  deliver: (id: string): Promise<Order> =>
    request<Order>(`/order/${id}/deliver`, { method: "PATCH" }),

  complete: (id: string): Promise<Order> =>
    request<Order>(`/order/${id}/complete`, { method: "PATCH" }),

  // F2: buyer-initiated return/refund. Eligible only on delivering/completed
  // orders without an active request (400 otherwise); flips the order to
  // `return_requested`.
  requestReturn: (orderId: string, reason: string): Promise<ReturnRequest> =>
    request<ReturnRequest>(`/order/${orderId}/return-request`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  getMyReturnRequests: (
    page = 1,
    limit = 10,
  ): Promise<PaginatedResponse<ReturnRequest>> => {
    const qs = toQuery({ page, limit });
    return request<PaginatedResponse<ReturnRequest>>(
      `/order/return-requests/mine${qs}`,
    );
  },

  // Seller sees only requests on orders containing their products; admin sees all.
  getReturnRequests: (
    page = 1,
    limit = 10,
    status?: ReturnRequestStatus,
  ): Promise<PaginatedResponse<ReturnRequest>> => {
    const qs = toQuery({ page, limit, status });
    return request<PaginatedResponse<ReturnRequest>>(
      `/order/return-requests${qs}`,
    );
  },

  // Approve records the (simulated) refund and moves the order to `refunded`.
  approveReturnRequest: (id: string): Promise<ReturnRequest> =>
    request<ReturnRequest>(`/order/return-requests/${id}/approve`, {
      method: "POST",
    }),

  // Reject restores the order to its previous status; reason is required.
  rejectReturnRequest: (id: string, reason: string): Promise<ReturnRequest> =>
    request<ReturnRequest>(`/order/return-requests/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  // F4: self-scoped revenue/status/top-product aggregation for the logged-in seller.
  getSellerAnalytics: (
    params: AnalyticsQueryParams = {},
  ): Promise<OrderAnalytics> => {
    const qs = toQuery({ ...params });
    return request<OrderAnalytics>(`/order/seller/analytics${qs}`);
  },

  // F4: global aggregation, admin-only (`shipping` `read:any`).
  getAdminAnalytics: (
    params: AnalyticsQueryParams = {},
  ): Promise<OrderAnalytics> => {
    const qs = toQuery({ ...params });
    return request<OrderAnalytics>(`/order/admin/analytics${qs}`);
  },
};
