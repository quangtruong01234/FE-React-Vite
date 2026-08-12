import { describe, it, expect } from 'vitest';
import type { OrderStatus } from '@/types';
import { isAwaitingPayment } from './orderPayment';

describe('isAwaitingPayment', () => {
  it('is false for COD at every status — there is nothing to pay online', () => {
    const statuses: OrderStatus[] = ['pending', 'confirmed', 'processing', 'delivering'];
    for (const status of statuses) {
      expect(isAwaitingPayment({ status, paymentMethod: 'cod', paidAt: null }), status).toBe(false);
    }
  });

  it('is false once paidAt is set', () => {
    expect(isAwaitingPayment({
      status: 'pending',
      paymentMethod: 'vnpay',
      paidAt: '2026-08-11T03:00:00.000Z',
    })).toBe(false);
  });

  it('is true for an unpaid online order the buyer can still pay for', () => {
    expect(isAwaitingPayment({ status: 'pending', paymentMethod: 'vnpay', paidAt: null })).toBe(true);
    expect(isAwaitingPayment({ status: 'processing', paymentMethod: 'zalopay', paidAt: null })).toBe(true);
  });

  it.each<OrderStatus>(['completed', 'canceled', 'refunded', 'return_requested'])(
    'never offers to pay a %s order, even with a null paidAt',
    (status) => {
      expect(isAwaitingPayment({ status, paymentMethod: 'vnpay', paidAt: null })).toBe(false);
    },
  );

  it('falls back to the status heuristic when the response predates paidAt', () => {
    // `undefined` = field absent (ORD-GUARD-01 not deployed yet). Treating that
    // as "unpaid" would offer to re-pay orders that were already settled.
    expect(isAwaitingPayment({ status: 'pending', paymentMethod: 'vnpay' })).toBe(true);
    expect(isAwaitingPayment({ status: 'confirmed', paymentMethod: 'vnpay' })).toBe(true);
    expect(isAwaitingPayment({ status: 'processing', paymentMethod: 'vnpay' })).toBe(false);
  });
});
