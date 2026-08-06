import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';

const PAGE_SIZE = 10;

/**
 * Paginated buyer order history. Pages are fetched lazily via `fetchNextPage`;
 * the server's `hasNext` decides when to stop. Keeps the existing
 * `orders.byUser` key so `useCancelOrder` invalidation still refreshes the list.
 */
export function useOrdersByUser(userId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.orders.byUser(userId),
    queryFn: ({ pageParam }) => api.orders.getByUser(userId, pageParam as number, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasNext ? (lastPageParam as number) + 1 : undefined,
    enabled: userId.length > 0,
  });
}
