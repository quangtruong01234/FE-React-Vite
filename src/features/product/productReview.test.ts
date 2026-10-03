import { describe, it, expect } from 'vitest';
import { reviewErrorMessage, REVIEW_COMMENT_MAX, showsVerifiedBadge } from './productReview';

describe('reviewErrorMessage', () => {
  it('maps 404 to the completed-order gate message', () => {
    expect(reviewErrorMessage({ statusCode: 404, message: 'Product not found in any completed order' }))
      .toBe('Đơn hàng chưa được xác nhận hoàn thành');
  });

  it('maps 409 to the already-reviewed message', () => {
    expect(reviewErrorMessage({ statusCode: 409, message: 'Already reviewed this product' }))
      .toBe('Bạn đã đánh giá sản phẩm này rồi');
  });

  it('maps 403 to the own-product message (REVIEW-VERIFIED-01)', () => {
    expect(reviewErrorMessage({ statusCode: 403, message: 'You cannot review your own product' }))
      .toBe('Bạn không thể đánh giá sản phẩm của chính mình');
  });

  it('reads legacy `status` when `statusCode` is absent', () => {
    expect(reviewErrorMessage({ status: 409, message: 'dup' })).toBe('Bạn đã đánh giá sản phẩm này rồi');
  });

  it('passes the server message through for other statuses', () => {
    expect(reviewErrorMessage({ statusCode: 400, message: 'rating must not be greater than 5' }))
      .toBe('rating must not be greater than 5');
    expect(reviewErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('falls back to a generic message when nothing usable is present', () => {
    expect(reviewErrorMessage(undefined)).toBe('Đã xảy ra lỗi');
    expect(reviewErrorMessage({ statusCode: 500, message: '   ' })).toBe('Đã xảy ra lỗi');
    expect(reviewErrorMessage({ message: 42 })).toBe('Đã xảy ra lỗi');
  });
});

describe('REVIEW_COMMENT_MAX', () => {
  it('matches the backend ≤2000 contract', () => {
    expect(REVIEW_COMMENT_MAX).toBe(2000);
  });
});

describe('showsVerifiedBadge', () => {
  it('shows the badge only on a definite true', () => {
    expect(showsVerifiedBadge({ isVerifiedPurchase: true })).toBe(true);
    expect(showsVerifiedBadge({ isVerifiedPurchase: false })).toBe(false);
  });

  it('renders nothing when the order service did not answer or the field is absent', () => {
    expect(showsVerifiedBadge({ isVerifiedPurchase: null })).toBe(false);
    expect(showsVerifiedBadge({})).toBe(false);
  });
});

describe('reviewErrorMessage — EN (I18N-03)', () => {
  it('maps the gated statuses to English copy', () => {
    expect(reviewErrorMessage({ statusCode: 404, message: 'x' }, 'en'))
      .toBe('Your order has not been confirmed as completed yet');
    expect(reviewErrorMessage({ statusCode: 403, message: 'x' }, 'en')).toBe("You can't review your own product");
    expect(reviewErrorMessage({ statusCode: 409, message: 'x' }, 'en')).toBe('You have already reviewed this product');
  });

  it('keeps the backend message and translates only the empty fallback', () => {
    expect(reviewErrorMessage({ statusCode: 400, message: 'rating must not be greater than 5' }, 'en'))
      .toBe('rating must not be greater than 5');
    expect(reviewErrorMessage(undefined, 'en')).toBe('Something went wrong');
  });
});
