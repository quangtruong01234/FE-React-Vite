import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/queryKeys';
import type { SellerOrderDetail } from '@/types';

/**
 * P1-01: lazily loads the enriched seller order detail (items with product
 * image + SKU label). Enabled only when the card is expanded so the list view
 * stays cheap.
 */
export function useSellerOrderDetail(
  id: number,
  enabled: boolean,
): ReturnType<typeof useQuery<SellerOrderDetail>> {
  return useQuery({
    queryKey: queryKeys.orders.sellerDetail(id),
    queryFn: () => api.orders.getSellerOrderDetail(id),
    enabled,
  });
}
