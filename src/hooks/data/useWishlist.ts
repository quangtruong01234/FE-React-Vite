import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import { collectWishlistIds, toggleWishlistId } from '@/features/wishlist/wishlistCache';
import type { PaginatedResponse, WishlistItem } from '@/types';

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
  return useQuery<Set<string>>({
    queryKey: queryKeys.products.wishlistIds,
    queryFn: () =>
      collectWishlistIds((page, limit) => api.products.getWishlist({ page, limit })),
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
    mutationFn: async ({ productId, wishlisted }: { productId: string; wishlisted: boolean }) => {
      if (wishlisted) await api.products.removeWishlist(productId);
      else await api.products.addWishlist(productId);
    },
    onMutate: async ({ productId, wishlisted }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.products.wishlistIds });
      const previous = queryClient.getQueryData<Set<string>>(queryKeys.products.wishlistIds);
      queryClient.setQueryData<Set<string>>(queryKeys.products.wishlistIds, (old) =>
        toggleWishlistId(old ?? new Set<string>(), productId, !wishlisted),
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
