import type { OrderStatus, OrderStatusCounts } from '@/types';
import { ACTIVE_STATUSES, RETURN_STATUSES } from '@/lib/domain/orderStatus';

export type OrderFilterKey = 'all' | 'pending' | 'completed' | 'return' | 'canceled';

/**
 * Map server-side per-status counts (full history) onto the buyer filter tabs.
 * Status grouping comes from `lib/orderStatus`: the "pending" tab aggregates
 * every in-flight status, the "return" tab both F2 return statuses (their
 * fields are optional until the counts endpoint confirms it returns them).
 * Returns zeroed counts when the server hasn't responded yet so the tabs render
 * "(0)" rather than crashing.
 */
export function orderFilterCounts(
  counts: OrderStatusCounts | undefined,
): Record<OrderFilterKey, number> {
  if (!counts) return { all: 0, pending: 0, completed: 0, return: 0, canceled: 0 };
  const sum = (statuses: readonly OrderStatus[]): number =>
    statuses.reduce((acc, s) => acc + (counts[s] ?? 0), 0);
  return {
    all: counts.all,
    pending: sum(ACTIVE_STATUSES),
    completed: counts.completed,
    return: sum(RETURN_STATUSES),
    canceled: counts.canceled,
  };
}
