import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import type { PaginatedResponse, OrderWithBuyer } from '@/types';

export function useSellerOrders(
  page: number,
  limit: number,
  status?: string,
): ReturnType<typeof useQuery<PaginatedResponse<OrderWithBuyer>>> {
  return useQuery({
    queryKey: queryKeys.orders.sellerList(page, limit, status),
    queryFn: () => api.orders.getSellerOrders(page, limit, status),
  });
}
