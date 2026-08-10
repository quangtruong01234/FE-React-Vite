import type { OrderStatus, OrderStatusCounts } from '@/types';
import { ACTIVE_STATUSES, RETURN_STATUSES } from '@/lib/domain/orderStatus';

export type OrderFilterKey = 'all' | 'pending' | 'completed' | 'return' | 'canceled';

/**
 * The `OrderStatus` set a buyer filter tab stands for — the single definition of
 * that grouping, consumed both by the badge counts below and by the server-side
 * `?status=` filter on `GET /order/user/:id`.
 *
 * `all` maps to an EMPTY list on purpose: the endpoint reads "no `status` key"
 * as unfiltered, so the tab must send nothing rather than all nine values.
 */
export function filterTabStatuses(tab: OrderFilterKey): readonly OrderStatus[] {
  switch (tab) {
    case 'all':
      return [];
    case 'pending':
      return ACTIVE_STATUSES;
    case 'return':
      return RETURN_STATUSES;
    default:
      return [tab];
  }
}

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
    pending: sum(filterTabStatuses('pending')),
    completed: sum(filterTabStatuses('completed')),
    return: sum(filterTabStatuses('return')),
    canceled: sum(filterTabStatuses('canceled')),
  };
}
