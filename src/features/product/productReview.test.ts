import { describe, it, expect } from 'vitest';
import { reviewErrorMessage, REVIEW_COMMENT_MAX } from './productReview';

describe('reviewErrorMessage', () => {
  it('maps 404 to the completed-order gate message', () => {
    expect(reviewErrorMessage({ statusCode: 404, message: 'Product not found in any completed order' }))
      .toBe('Đơn hàng chưa được xác nhận hoàn thành');
  });

  it('maps 409 to the already-reviewed message', () => {
    expect(reviewErrorMessage({ statusCode: 409, message: 'Already reviewed this product' }))
      .toBe('Bạn đã đánh giá sản phẩm này rồi');
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
