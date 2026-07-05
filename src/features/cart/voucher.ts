import type { ApiError } from '@/types';

/**
 * Pure helpers for the checkout voucher flow (F3).
 *
 * Backend contract: `POST /order/voucher/validate` previews a code against the
 * basket without redeeming; `POST /order` accepts an optional `voucherCode`.
 * Codes are case-insensitive (normalized to uppercase server-side) and only
 * valid on single-seller baskets (multi-seller + code → 400).
 */

/** Codes are case-insensitive server-side; normalize before sending/comparing. */
export function normalizeVoucherCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/**
 * Distinct sellers in the basket, ignoring items whose product hasn't loaded
 * yet (unknown seller must not flip the single-seller guard on/off mid-load).
 */
export function distinctSellerCount(sellerIds: Array<number | undefined>): number {
  return new Set(sellerIds.filter((id): id is number => id != null)).size;
}

/** Backend computes `total = itemsTotal - discount + shippingFee`; mirror it for the preview. */
export function discountedGrandTotal(
  itemsTotal: number,
  discountAmount: number,
  shippingFee: number,
): number {
  return Math.max(0, itemsTotal - discountAmount) + shippingFee;
}

/**
 * Friendly message for a failed voucher validate/redeem. 404 = unknown or
 * inactive code; 400 covers the rejection reasons (message keywords come from
 * the backend contract — fall back to the raw server message when unmatched).
 */
export function voucherErrorMessage(error: unknown): string {
  const err = error as ApiError | undefined;
  const status = err?.statusCode ?? err?.status;
  if (status === 404) return 'Mã giảm giá không tồn tại hoặc đã bị vô hiệu hóa.';
  const message = typeof err?.message === 'string' ? err.message.trim() : '';
  if (status === 400) {
    const m = message.toLowerCase();
    if (m.includes('expired')) return 'Mã giảm giá đã hết hạn.';
    if (m.includes('not started') || m.includes('not yet')) return 'Mã giảm giá chưa đến thời gian áp dụng.';
    if (m.includes('min')) return 'Đơn hàng chưa đạt giá trị tối thiểu để dùng mã này.';
    if (m.includes('per-user') || m.includes('per user') || m.includes('already')) return 'Bạn đã sử dụng mã này rồi.';
    if (m.includes('usage') || m.includes('limit')) return 'Mã giảm giá đã hết lượt sử dụng.';
    if (m.includes('seller') || m.includes('multi')) return 'Mã giảm giá chỉ áp dụng cho đơn hàng từ một người bán.';
  }
  return message || 'Không thể áp dụng mã giảm giá. Vui lòng thử lại.';
}
