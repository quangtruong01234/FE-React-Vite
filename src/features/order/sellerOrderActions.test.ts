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

  it.each<[OrderStatus, string]>([
    ['processing', 'ship'],
    ['shipped', 'deliver'],
    ['delivering', 'complete'],
  ])('maps %s → %s (post-processing lifecycle)', (status, kind) => {
    expect(getSellerOrderAction(status)?.kind).toBe(kind);
  });

  it.each<OrderStatus>(['completed', 'canceled'])(
    'exposes no seller action for terminal status %s',
    (status) => {
      expect(getSellerOrderAction(status)).toBeNull();
    },
  );
});
