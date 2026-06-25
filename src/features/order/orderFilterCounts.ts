import type { OrderStatusCounts } from '@/types';

export type OrderFilterKey = 'all' | 'pending' | 'completed' | 'canceled';

/**
 * Map server-side per-status counts (full history) onto the buyer filter tabs.
 * The "pending" tab aggregates every in-flight status, mirroring `ACTIVE_STATUSES`
 * in `OrderHistoryPage`. Returns zeroed counts when the server hasn't responded
 * yet so the tabs render "(0)" rather than crashing.
 */
export function orderFilterCounts(
  counts: OrderStatusCounts | undefined,
): Record<OrderFilterKey, number> {
  if (!counts) return { all: 0, pending: 0, completed: 0, canceled: 0 };
  return {
    all: counts.all,
    pending:
      counts.pending +
      counts.confirmed +
      counts.processing +
      counts.shipped +
      counts.delivering,
    completed: counts.completed,
    canceled: counts.canceled,
  };
}
