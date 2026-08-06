import type { QueryClient } from '@tanstack/react-query';
import { queryClient } from '@/lib/query/queryClient';
import { queryKeys } from '@/hooks/query/queryKeys';

/**
 * Which order views a mutation touched. `all` sweeps the whole orders prefix
 * (checkout, return review — the order's status ripples into every list);
 * the narrow flags refresh only the views that can actually change.
 */
export interface OrderViewScope {
  /** Order detail page for this id. */
  orderId?: string;
  /** Buyer history + filter badges — byUser prefix also covers statusCounts. */
  buyerId?: string;
  /** Seller order lists (list + detail). */
  seller?: boolean;
  /** Return-request lists (buyer "mine" + seller queue). */
  returns?: boolean;
  /** Everything under the orders prefix. Overrides the narrow flags. */
  all?: boolean;
}

/** Single place that maps an order mutation to the query keys it must refresh. */
export function invalidateOrderViews(scope: OrderViewScope, client: QueryClient = queryClient): void {
  if (scope.all) {
    void client.invalidateQueries({ queryKey: queryKeys.orders.all });
    return;
  }
  if (scope.orderId != null) {
    void client.invalidateQueries({ queryKey: queryKeys.orders.detail(scope.orderId) });
  }
  if (scope.buyerId != null) {
    void client.invalidateQueries({ queryKey: queryKeys.orders.byUser(scope.buyerId) });
  }
  if (scope.seller) {
    void client.invalidateQueries({ queryKey: queryKeys.orders.seller });
  }
  if (scope.returns) {
    void client.invalidateQueries({ queryKey: queryKeys.orders.returnRequests });
  }
}
