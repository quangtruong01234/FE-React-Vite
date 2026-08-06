import type {
  ApiError,
  OrderStatus,
  ReturnRequest,
  ReturnRequestStatus,
} from '@/types';
import { PAYMENT_LABEL } from './orderConstants';
import { isReturnStatus } from '@/lib/domain/orderStatus';

/**
 * Pure helpers for the buyer return/refund flow (F2).
 *
 * Backend contract: `POST /order/:id/return-request` is only accepted while the
 * order is `delivering`/`completed` and has no active (pending_review) request —
 * anything else returns 400. Creating a request flips the order to
 * `return_requested`, so an eligible status already implies no active request
 * (a rejected request restores the previous status and MAY be re-requested).
 */
export function canRequestReturn(status: OrderStatus): boolean {
  return status === 'delivering' || status === 'completed';
}

/** Order statuses for which a return request may exist and should be surfaced. */
export function hasReturnActivity(status: OrderStatus): boolean {
  return isReturnStatus(status);
}

/**
 * Latest request for an order from a newest-first list (`/return-requests/mine`
 * orders by most recent activity, so the first match wins).
 */
export function findReturnRequestForOrder(
  requests: ReturnRequest[],
  orderId: string,
): ReturnRequest | null {
  return requests.find((r) => r.orderId === orderId) ?? null;
}

export interface ReturnStatusMeta {
  label: string;
  className: string;
}

const RETURN_STATUS_META: Record<ReturnRequestStatus, ReturnStatusMeta> = {
  pending_review: { label: 'Chờ duyệt', className: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20' },
  approved:       { label: 'Đã duyệt',  className: 'bg-accent-green/10 text-accent-green border-accent-green/20' },
  rejected:       { label: 'Từ chối',   className: 'bg-accent-red/10 text-accent-red border-accent-red/20' },
};

export function returnStatusMeta(status: ReturnRequestStatus): ReturnStatusMeta {
  return RETURN_STATUS_META[status] ?? RETURN_STATUS_META.pending_review;
}

/** Human line for the recorded refund: online methods settle instantly, COD is manual. */
export function refundStatusLabel(request: ReturnRequest): string | null {
  if (request.status !== 'approved' || !request.refundStatus) return null;
  const method = request.refundMethod ? PAYMENT_LABEL[request.refundMethod] : null;
  const base = request.refundStatus === 'refunded' ? 'Đã hoàn tiền' : 'Chờ hoàn tiền thủ công';
  return method ? `${base} · ${method}` : base;
}

/** Friendly message for a failed return-request submit (400 = ineligible order). */
export function returnRequestErrorMessage(error: unknown): string {
  const err = error as ApiError | undefined;
  if (err?.statusCode === 400) {
    return 'Đơn hàng không đủ điều kiện trả hàng (chỉ đơn đang giao/hoàn thành, chưa có yêu cầu đang chờ).';
  }
  if (typeof err?.message === 'string' && err.message.trim()) return err.message;
  return 'Không thể gửi yêu cầu trả hàng. Vui lòng thử lại.';
}
