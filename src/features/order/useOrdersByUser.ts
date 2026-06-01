import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/queryKeys';
import type { PaginatedResponse, Order } from '@/types';

export function useOrdersByUser(userId: number): ReturnType<typeof useQuery<PaginatedResponse<Order>>> {
  return useQuery({
    queryKey: queryKeys.orders.byUser(userId),
    queryFn: () => api.orders.getByUser(userId),
    enabled: userId > 0,
  });
}
