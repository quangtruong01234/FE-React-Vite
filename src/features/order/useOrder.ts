import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/queryKeys';
import type { Order } from '@/types';

export function useOrder(orderId: number): ReturnType<typeof useQuery<Order>> {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => api.orders.getById(orderId),
    enabled: orderId > 0,
  });
}
