import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import type { Order } from '@/types';

export function useOrder(orderId: string): ReturnType<typeof useQuery<Order>> {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => api.orders.getById(orderId),
    enabled: orderId.length > 0,
  });
}
