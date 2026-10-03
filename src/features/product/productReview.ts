import type { ApiError, Review } from '@/types';
import type { Lang } from '@/lib/i18n/lang';
import { bindTranslator } from '@/lib/i18n/messages';
import { productMessages } from './product.i18n';

/**
 * Pure helpers for the product review flow (F1).
 *
 * Backend contract: `POST /products/:id/reviews` `{ rating: 1–5, comment? ≤2000 }`.
 * Create is gated on a completed purchase (`404` when the buyer has no completed
 * order containing the product) and limited to one review per user per product
 * (`409` on a duplicate). A seller reviewing their own listing gets `403`
 * (REVIEW-VERIFIED-01).
 */

export const REVIEW_COMMENT_MAX = 2000;

/** Friendly message for a failed review create, per the F1 status-code contract. */
export function reviewErrorMessage(error: unknown, lang: Lang = 'vi'): string {
  const t = bindTranslator(productMessages, lang);
  const err = error as ApiError | undefined;
  const status = err?.statusCode ?? err?.status;
  if (status === 404) return t('reviewNotCompleted');
  if (status === 403) return t('reviewOwnProduct');
  if (status === 409) return t('reviewDuplicate');
  const message = typeof err?.message === 'string' ? err.message.trim() : '';
  return message || t('reviewFailed');
}

/**
 * Show the "Đã mua hàng" badge only on a definite `true`. `null` means the order
 * service did not answer — rendering it as "not verified" would accuse a real buyer.
 */
export function showsVerifiedBadge(review: Pick<Review, 'isVerifiedPurchase'>): boolean {
  return review.isVerifiedPurchase === true;
}
