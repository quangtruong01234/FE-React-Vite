import { describe, it, expect } from 'vitest';
import type { OrderStatus } from '@/types';
import { getSellerOrderAction } from './sellerOrderActions';

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
