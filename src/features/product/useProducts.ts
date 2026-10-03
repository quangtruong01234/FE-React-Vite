import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import type { ProductParams, ProductWithInventory, PaginatedResponse } from '@/types';

/** Key + fetcher for one product-list page — shared with route prefetches. */
export function productListQuery(params: ProductParams): {
  queryKey: ReturnType<typeof queryKeys.products.list>;
  queryFn: () => Promise<PaginatedResponse<ProductWithInventory>>;
} {
  return {
    queryKey: queryKeys.products.list(params),
    queryFn: () => api.products.getList(params),
  };
}

export function useProducts(
  params: ProductParams = {},
  options: { enabled?: boolean } = {},
): {
  data: PaginatedResponse<ProductWithInventory> | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
} {
  return useQuery({
    ...productListQuery(params),
    enabled: options.enabled ?? true,
    // Paginated/filtered list — keep the previous page rendered while the next
    // one loads instead of flashing an empty grid (isFetching signals the swap).
    placeholderData: keepPreviousData,
  });
}
