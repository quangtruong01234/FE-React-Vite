import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import type { OrderStatusCounts } from '@/types';

/**
 * Full-history per-status order counts for the buyer's filter tabs. Counts span
 * the entire history (server-side), so badges stay accurate regardless of how
 * many pages the infinite list has loaded. No-ops while `userId <= 0`.
 */
export function useOrderStatusCounts(userId: number): ReturnType<typeof useQuery<OrderStatusCounts>> {
  return useQuery({
    queryKey: queryKeys.orders.statusCounts(userId),
    queryFn: () => api.orders.getStatusCounts(userId),
    enabled: userId > 0,
  });
}
