import { describe, it, expect } from 'vitest';
import type { OrderStatus } from '@/types';
import { getSellerOrderAction, getSellerOrderActionState } from './sellerOrderActions';

describe('getSellerOrderAction', () => {
  it('maps pending → confirm', () => {
    expect(getSellerOrderAction('pending')).toEqual({ kind: 'confirm', label: 'Xác nhận đơn' });
  });

  it('maps confirmed → ready-to-ship with a label that matches the real transition', () => {
    const action = getSellerOrderAction('confirmed');
    expect(action?.kind).toBe('ready-to-ship');
    // must NOT claim "Đã giao GHN" — ready-to-ship only moves confirmed → processing
    expect(action?.label).not.toMatch(/đã giao/i);
  });

  it.each<OrderStatus>(['processing', 'shipped', 'delivering'])(
    'exposes no seller action once handed to GHN (%s is carrier/buyer-driven)',
    (status) => {
      // Shopee-style: after ready-to-ship the seller has no manual advance —
      // shipped → delivering → completed are driven by the GHN webhook / buyer.
      expect(getSellerOrderAction(status)).toBeNull();
    },
  );

  it.each<OrderStatus>(['completed', 'canceled'])(
    'exposes no seller action for terminal status %s',
    (status) => {
      expect(getSellerOrderAction(status)).toBeNull();
    },
  );
});

describe('getSellerOrderActionState', () => {
  it('lets the seller confirm a paid online order', () => {
    const state = getSellerOrderActionState({
      status: 'pending',
      paymentMethod: 'vnpay',
      paidAt: '2026-08-11T03:00:00.000Z',
    });
    expect(state.action?.kind).toBe('confirm');
    expect(state.blockedReason).toBeNull();
  });

  it('blocks the action while an online order has not been paid (ORD-GUARD-01)', () => {
    // The backend rejects the transition anyway — showing the button only buys
    // the seller a 400. Explain instead.
    const state = getSellerOrderActionState({
      status: 'pending',
      paymentMethod: 'vnpay',
      paidAt: null,
    });
    expect(state.action?.kind).toBe('confirm');
    expect(state.blockedReason).toBe('Khách chưa thanh toán — chưa thể xử lý đơn');
  });

  it('never blocks COD — paidAt stays null there until delivery', () => {
    const state = getSellerOrderActionState({
      status: 'pending',
      paymentMethod: 'cod',
      paidAt: null,
    });
    expect(state.action?.kind).toBe('confirm');
    expect(state.blockedReason).toBeNull();
  });

  it('degrades to the old behaviour when the response predates paidAt', () => {
    // `undefined` = field absent, which is not evidence of non-payment. Blocking
    // on it would freeze every seller against an older backend.
    const state = getSellerOrderActionState({ status: 'pending', paymentMethod: 'zalopay' });
    expect(state.blockedReason).toBeNull();
  });

  it('reports no blocked reason when there is no action to block', () => {
    const state = getSellerOrderActionState({
      status: 'shipped',
      paymentMethod: 'vnpay',
      paidAt: null,
    });
    expect(state).toEqual({ action: null, blockedReason: null });
  });
});
