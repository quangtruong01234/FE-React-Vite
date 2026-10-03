import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import type { Order, OrderTimeline } from '@/types';

export function useOrder(orderId: string): ReturnType<typeof useQuery<Order>> {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => api.orders.getById(orderId),
    enabled: orderId.length > 0,
  });
}

/**
 * ORDER-TIMELINE-01 — the order's event history. Optional on the page: a
 * backend without the route answers 404, so no retries and the caller simply
 * hides the section on error.
 */
export function useOrderHistory(orderId: string): ReturnType<typeof useQuery<OrderTimeline>> {
  return useQuery({
    queryKey: queryKeys.orders.history(orderId),
    queryFn: () => api.orders.getHistory(orderId),
    enabled: orderId.length > 0,
    retry: false,
  });
}
