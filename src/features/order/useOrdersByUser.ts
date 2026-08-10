import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import type { OrderStatus } from '@/types';

const PAGE_SIZE = 10;

/**
 * Paginated buyer order history, filtered **server-side** by status (handoff
 * 2026-08-07). Pass the tab's status list — an empty list means unfiltered.
 * `total`/`hasNext` then describe the filtered set, so each tab paginates on its
 * own instead of the client holding the whole history to filter it.
 *
 * The key stays under the `orders.byUser` prefix so `invalidateOrderViews`
 * refreshes every tab after a cancel/return with the invalidation it already does.
 */
export function useOrdersByUser(userId: string, statuses: readonly OrderStatus[] = []) {
  return useInfiniteQuery({
    queryKey: queryKeys.orders.byUserList(userId, statuses),
    queryFn: ({ pageParam }) =>
      api.orders.getByUser(userId, pageParam as number, PAGE_SIZE, statuses),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasNext ? (lastPageParam as number) + 1 : undefined,
    enabled: userId.length > 0,
  });
}
