import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import { wishlistIdSet, toggleWishlistId } from '@/features/wishlist/wishlistCache';
import type { PaginatedResponse, WishlistItem } from '@/types';

// Membership fetch size — one page large enough to cover a typical wishlist so
// the heart state on product cards/detail reflects every favorite. The paginated
// `/wishlist` page view (`useWishlistPage`) has its own query for browsing beyond
// this window.
const WISHLIST_ID_LIMIT = 200;

/** Paginated wishlist for the `/wishlist` page. */
export function useWishlistPage(page: number, limit: number) {
  return useQuery<PaginatedResponse<WishlistItem>>({
    queryKey: queryKeys.products.wishlistList(page, limit),
    queryFn: () => api.products.getWishlist({ page, limit }),
    // Keep the previous page rendered while the next one loads (no empty flash).
    placeholderData: keepPreviousData,
  });
}

/** Membership `Set` of wishlisted product ids — drives every heart toggle's state. */
export function useWishlistIds() {
  return useQuery<Set<number>>({
    queryKey: queryKeys.products.wishlistIds,
    queryFn: async () => {
      const res = await api.products.getWishlist({ page: 1, limit: WISHLIST_ID_LIMIT });
      return wishlistIdSet(res.data);
    },
  });
}

/**
 * Toggle a product in/out of the wishlist. Pass the CURRENT `wishlisted` state;
 * the hook fires remove when already wishlisted, add otherwise. Optimistically
 * flips the cached id-set (both mutations are idempotent server-side) and
 * invalidates the whole wishlist tree on settle so the page view + count resync.
 */
export function useToggleWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, wishlisted }: { productId: number; wishlisted: boolean }) =>
      wishlisted ? api.products.removeWishlist(productId) : api.products.addWishlist(productId),
    onMutate: async ({ productId, wishlisted }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.products.wishlistIds });
      const previous = queryClient.getQueryData<Set<number>>(queryKeys.products.wishlistIds);
      queryClient.setQueryData<Set<number>>(queryKeys.products.wishlistIds, (old) =>
        toggleWishlistId(old ?? new Set<number>(), productId, !wishlisted),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKeys.products.wishlistIds, ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.wishlist });
    },
  });
}
