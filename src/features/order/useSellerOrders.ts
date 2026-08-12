import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import type { PaginatedResponse, SellerOrderListRow } from '@/types';

export function useSellerOrders(
  page: number,
  limit: number,
  status?: string,
): ReturnType<typeof useQuery<PaginatedResponse<SellerOrderListRow>>> {
  return useQuery({
    queryKey: queryKeys.orders.sellerList(page, limit, status),
    queryFn: () => api.orders.getSellerOrders(page, limit, status),
    // Keep the previous page rendered while the next one loads (no empty flash).
    placeholderData: keepPreviousData,
  });
}
