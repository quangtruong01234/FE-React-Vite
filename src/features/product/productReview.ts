import type { ApiError } from '@/types';

/**
 * Pure helpers for the product review flow (F1).
 *
 * Backend contract: `POST /products/:id/reviews` `{ rating: 1–5, comment? ≤2000 }`.
 * Create is gated on a completed purchase (`404` when the buyer has no completed
 * order containing the product) and limited to one review per user per product
 * (`409` on a duplicate).
 */

export const REVIEW_COMMENT_MAX = 2000;

/** Friendly message for a failed review create, per the F1 status-code contract. */
export function reviewErrorMessage(error: unknown): string {
  const err = error as ApiError | undefined;
  const status = err?.statusCode ?? err?.status;
  if (status === 404) return 'Đơn hàng chưa được xác nhận hoàn thành';
  if (status === 409) return 'Bạn đã đánh giá sản phẩm này rồi';
  const message = typeof err?.message === 'string' ? err.message.trim() : '';
  return message || 'Đã xảy ra lỗi';
}
