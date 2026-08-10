import { describe, it, expect } from 'vitest';
import type { OrderStatusCounts } from '@/types';
import { orderFilterCounts, filterTabStatuses } from './orderFilterCounts';

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

describe('filterTabStatuses', () => {
  it('sends NOTHING for the all tab — an empty status key is not "unfiltered"', () => {
    expect(filterTabStatuses('all')).toEqual([]);
  });

  it('expands the pending tab to every in-flight status', () => {
    expect(filterTabStatuses('pending')).toEqual([
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivering',
    ]);
  });

  it('expands the return tab to both F2 statuses', () => {
    expect(filterTabStatuses('return')).toEqual(['return_requested', 'refunded']);
  });

  it('maps the single-status tabs to themselves', () => {
    expect(filterTabStatuses('completed')).toEqual(['completed']);
    expect(filterTabStatuses('canceled')).toEqual(['canceled']);
  });

  it('never emits a status the backend rejects with 400', () => {
    // The endpoint knows nine values: there is no `delivered`, and cancellation
    // is spelled `canceled` with one l. Either typo 400s the whole tab.
    const emitted: string[] = (
      ['all', 'pending', 'completed', 'return', 'canceled'] as const
    ).flatMap((tab) => [...filterTabStatuses(tab)]);
    expect(emitted).not.toContain('delivered');
    expect(emitted).not.toContain('cancelled');
    expect(emitted).toContain('canceled');
  });
});
