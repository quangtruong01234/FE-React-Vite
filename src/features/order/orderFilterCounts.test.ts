import { describe, it, expect } from 'vitest';
import type { OrderStatusCounts } from '@/types';
import { orderFilterCounts } from './orderFilterCounts';

const counts: OrderStatusCounts = {
  all: 21,
  pending: 3,
  confirmed: 4,
  processing: 5,
  shipped: 2,
  delivering: 1,
  completed: 5,
  canceled: 1,
};

describe('orderFilterCounts', () => {
  it('passes through all/completed/canceled directly', () => {
    const result = orderFilterCounts(counts);
    expect(result.all).toBe(21);
    expect(result.completed).toBe(5);
    expect(result.canceled).toBe(1);
  });

  it('aggregates every in-flight status into the pending tab', () => {
    // pending + confirmed + processing + shipped + delivering = 3+4+5+2+1
    expect(orderFilterCounts(counts).pending).toBe(15);
  });

  it('returns zeroed counts while the server has not responded', () => {
    expect(orderFilterCounts(undefined)).toEqual({
      all: 0,
      pending: 0,
      completed: 0,
      return: 0,
      canceled: 0,
    });
  });

  it('groups both return statuses into the return tab', () => {
    expect(orderFilterCounts({ ...counts, return_requested: 2, refunded: 3 }).return).toBe(5);
  });

  it('treats missing return-status counts as zero (endpoint not yet updated)', () => {
    expect(orderFilterCounts(counts).return).toBe(0);
  });
});
