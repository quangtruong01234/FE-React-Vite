import { describe, it, expect } from 'vitest';
import {
  ORDER_STATUS_META,
  ORDER_STATUSES,
  ACTIVE_STATUSES,
  RETURN_STATUSES,
  isActiveStatus,
  isReturnStatus,
} from './orderStatus';
import type { OrderStatus } from '@/types';

describe('ORDER_STATUS_META', () => {
  it('covers every status with a non-empty label and badge class', () => {
    for (const status of ORDER_STATUSES) {
      const meta = ORDER_STATUS_META[status];
      expect(meta.label.length, status).toBeGreaterThan(0);
      expect(meta.badgeClass.length, status).toBeGreaterThan(0);
    }
  });

  it('no status is both active and return', () => {
    for (const status of ORDER_STATUSES) {
      const meta = ORDER_STATUS_META[status];
      expect(meta.isActive && meta.isReturn, status).toBe(false);
    }
  });
});

describe('status groups', () => {
  it('ACTIVE_STATUSES covers every in-flight status (the buyer "Đang xử lý" tab)', () => {
    expect(ACTIVE_STATUSES).toEqual([
      'pending', 'confirmed', 'processing', 'shipped', 'delivering',
    ]);
  });

  it('RETURN_STATUSES covers the F2 return flow', () => {
    expect(RETURN_STATUSES).toEqual(['return_requested', 'refunded']);
  });

  it('terminal statuses belong to neither group', () => {
    const terminal: OrderStatus[] = ['completed', 'canceled'];
    for (const status of terminal) {
      expect(isActiveStatus(status), status).toBe(false);
      expect(isReturnStatus(status), status).toBe(false);
    }
  });
});
