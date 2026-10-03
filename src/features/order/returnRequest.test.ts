import { describe, it, expect } from 'vitest';
import type { OrderStatus, ReturnRequest } from '@/types';
import {
  canRequestReturn,
  hasReturnActivity,
  findReturnRequestForOrder,
  returnStatusMeta,
  refundStatusLabel,
  reviewerLabel,
  returnRequestErrorMessage,
  returnPhotoError,
  returnRequestPayload,
  MAX_RETURN_PHOTOS,
} from './returnRequest';

function makeRequest(overrides: Partial<ReturnRequest> = {}): ReturnRequest {
  return {
    id: 'rr_1',
    orderId: 'ord_10',
    userId: 'usr_17',
    reason: 'Sản phẩm lỗi',
    status: 'pending_review',
    rejectReason: null,
    refundAmount: null,
    refundMethod: null,
    refundStatus: null,
    reviewedBy: null,
    createdAt: '2026-07-03T00:00:00Z',
    updatedAt: '2026-07-03T00:00:00Z',
    ...overrides,
  };
}

describe('reviewerLabel', () => {
  it('names the reviewer when the backend hydrated it (OVERFETCH-01)', () => {
    const request = makeRequest({
      status: 'approved',
      reviewedBy: 'usr_0000000000000004',
      reviewer: { id: 'usr_0000000000000004', username: 'shopA', avatar: null },
    });
    expect(reviewerLabel(request)).toBe('@shopA');
  });

  it('falls back to the bare reviewedBy id on a pre-rollout response', () => {
    const request = makeRequest({ status: 'rejected', reviewedBy: 'usr_0000000000000004' });
    expect(reviewerLabel(request)).toBe('#usr_0000000000000004');
  });

  it('shows nothing while the request is still awaiting review', () => {
    expect(reviewerLabel(makeRequest({ status: 'pending_review' }))).toBeNull();
  });

  it('shows nothing for an old decided row that recorded no reviewer', () => {
    expect(reviewerLabel(makeRequest({ status: 'approved', reviewedBy: null }))).toBeNull();
  });
});

describe('canRequestReturn', () => {
  it('allows only delivering and completed orders', () => {
    const eligible: OrderStatus[] = ['delivering', 'completed'];
    const ineligible: OrderStatus[] = [
      'pending', 'confirmed', 'processing', 'shipped', 'canceled', 'return_requested', 'refunded',
    ];
    for (const s of eligible) expect(canRequestReturn(s)).toBe(true);
    for (const s of ineligible) expect(canRequestReturn(s)).toBe(false);
  });
});

describe('hasReturnActivity', () => {
  it('flags only the two return statuses', () => {
    expect(hasReturnActivity('return_requested')).toBe(true);
    expect(hasReturnActivity('refunded')).toBe(true);
    expect(hasReturnActivity('completed')).toBe(false);
    expect(hasReturnActivity('canceled')).toBe(false);
  });
});

describe('findReturnRequestForOrder', () => {
  it('returns the first (newest) match for the order', () => {
    const newest = makeRequest({ id: 'rr_3', orderId: 'ord_10', status: 'rejected' });
    const older = makeRequest({ id: 'rr_1', orderId: 'ord_10' });
    const other = makeRequest({ id: 'rr_2', orderId: 'ord_99' });
    expect(findReturnRequestForOrder([newest, other, older], 'ord_10')).toBe(newest);
  });

  it('returns null when the order has no request', () => {
    expect(findReturnRequestForOrder([makeRequest({ orderId: 'ord_99' })], 'ord_10')).toBeNull();
    expect(findReturnRequestForOrder([], 'ord_10')).toBeNull();
  });
});

describe('returnStatusMeta', () => {
  it('maps each request status to a label', () => {
    expect(returnStatusMeta('pending_review').label).toBe('Chờ duyệt');
    expect(returnStatusMeta('approved').label).toBe('Đã duyệt');
    expect(returnStatusMeta('rejected').label).toBe('Từ chối');
  });
});

describe('refundStatusLabel', () => {
  it('returns null unless the request is approved with a refund status', () => {
    expect(refundStatusLabel(makeRequest())).toBeNull();
    expect(refundStatusLabel(makeRequest({ status: 'rejected' }))).toBeNull();
    expect(refundStatusLabel(makeRequest({ status: 'approved', refundStatus: null }))).toBeNull();
  });

  it('labels an instant online refund with the payment method', () => {
    const req = makeRequest({ status: 'approved', refundStatus: 'refunded', refundMethod: 'zalopay' });
    expect(refundStatusLabel(req)).toBe('Đã hoàn tiền · ZaloPay');
  });

  it('labels a COD refund as manual-pending', () => {
    const req = makeRequest({ status: 'approved', refundStatus: 'manual_pending', refundMethod: 'cod' });
    expect(refundStatusLabel(req)).toBe('Chờ hoàn tiền thủ công · Thanh toán khi nhận hàng (COD)');
  });
});

describe('returnRequestErrorMessage', () => {
  it('maps 400 to the ineligible-order message', () => {
    expect(returnRequestErrorMessage({ statusCode: 400, status: 400, message: 'Order is not eligible' }))
      .toContain('không đủ điều kiện');
  });

  it('falls back to the server message, then a generic one', () => {
    expect(returnRequestErrorMessage({ statusCode: 404, status: 404, message: 'Order 5 not found' }))
      .toBe('Order 5 not found');
    expect(returnRequestErrorMessage(undefined)).toBe('Không thể gửi yêu cầu trả hàng. Vui lòng thử lại.');
  });
});

describe('return helpers in English', () => {
  it('labels review states, refunds and errors in English', () => {
    expect(returnStatusMeta('pending_review', 'en').label).toBe('Pending review');
    expect(returnStatusMeta('approved', 'en').label).toBe('Approved');
    expect(returnStatusMeta('rejected', 'en').label).toBe('Rejected');
    const cod = makeRequest({ status: 'approved', refundStatus: 'manual_pending', refundMethod: 'cod' });
    expect(refundStatusLabel(cod, 'en')).toBe('Awaiting manual refund · Cash on delivery (COD)');
    expect(returnRequestErrorMessage({ statusCode: 400, status: 400, message: 'x' }, 'en')).toContain(
      'not eligible',
    );
    expect(returnRequestErrorMessage(undefined, 'en')).toBe(
      "Couldn't submit the return request. Please try again.",
    );
  });
});

describe('RETURN-PHOTO-01 helpers', () => {
  const url = (n: number): string => `https://res.cloudinary.com/demo/image/upload/v1/trybuy/returns/usr_1/p${n}.jpg`;

  it('omits imageUrls when there are no photos, so an old gateway still accepts the body', () => {
    expect(returnRequestPayload('  Hỏng  ')).toEqual({ reason: 'Hỏng' });
    expect(returnRequestPayload('Hỏng', [])).toEqual({ reason: 'Hỏng' });
    expect('imageUrls' in returnRequestPayload('Hỏng', [''])).toBe(false);
  });

  it('sends unique photo urls, capped at the backend limit', () => {
    const urls = [url(1), url(1), url(2), url(3), url(4), url(5), url(6)];
    expect(returnRequestPayload('Hỏng', urls)).toEqual({
      reason: 'Hỏng',
      imageUrls: [url(1), url(2), url(3), url(4), url(5)],
    });
    expect(MAX_RETURN_PHOTOS).toBe(5);
  });

  it('accepts only jpg, png and webp photos up to 10 MB', () => {
    expect(returnPhotoError({ type: 'image/jpeg', size: 1024, name: 'a.jpg' })).toBeNull();
    expect(returnPhotoError({ type: 'image/png', size: 1024 })).toBeNull();
    expect(returnPhotoError({ type: '', size: 1024, name: 'a.WEBP' })).toBeNull();
    expect(returnPhotoError({ type: 'image/gif', size: 1024, name: 'a.gif' }, 'en'))
      .toBe('Only JPG, PNG or WEBP photos are accepted');
    expect(returnPhotoError({ type: 'image/heic', size: 1024 }, 'en'))
      .toBe('Only JPG, PNG or WEBP photos are accepted');
    expect(returnPhotoError({ type: 'image/png', size: 11 * 1024 * 1024 }, 'en'))
      .toBe('Image is larger than 10MB');
  });

  it('tells a photo rejection apart from an ineligible order', () => {
    expect(returnRequestErrorMessage(
      { statusCode: 400, status: 400, message: 'each value in imageUrls must be a Cloudinary URL' },
      'en',
    )).toBe('A photo was not accepted. Remove it and upload it again.');
    expect(returnRequestErrorMessage({ statusCode: 400, status: 400, message: 'Order is not eligible' }, 'en'))
      .not.toBe('A photo was not accepted. Remove it and upload it again.');
  });
});
