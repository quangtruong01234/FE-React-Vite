import { describe, it, expect } from 'vitest';
import type { OrderStatus, ReturnRequest } from '@/types';
import {
  canRequestReturn,
  hasReturnActivity,
  findReturnRequestForOrder,
  returnStatusMeta,
  refundStatusLabel,
  returnRequestErrorMessage,
} from './returnRequest';

function makeRequest(overrides: Partial<ReturnRequest> = {}): ReturnRequest {
  return {
    id: 'rr_1',
    orderId: 'ord_10',
    userId: 'usr_17',
    reason: 'Sản phẩm lỗi',
    status: 'pending_review',
    rejectReason: null,
    previousOrderStatus: 'completed',
    refundAmount: null,
    refundMethod: null,
    refundStatus: null,
    reviewedBy: null,
    createdAt: '2026-07-03T00:00:00Z',
    updatedAt: '2026-07-03T00:00:00Z',
    ...overrides,
  };
}

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
