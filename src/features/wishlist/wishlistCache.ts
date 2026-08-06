import type { PaginatedResponse, WishlistItem } from '@/types';

/**
 * Build the membership `Set` of product ids from a wishlist page payload.
 * Opaque product ids are preserved exactly as returned by the backend.
 */
export function wishlistIdSet(items: WishlistItem[]): Set<string> {
  return new Set(items.map((item) => item.id));
}

// Backend caps `limit` at 100 on `GET /products/wishlist` (over → 400), so the
// membership set is collected one 100-item page at a time.
export const WISHLIST_ID_PAGE_SIZE = 100;
// Safety bound so a pathologically large wishlist can't fan out unboundedly.
export const MAX_WISHLIST_ID_PAGES = 10;

/**
 * Collect the full membership `Set` of wishlisted product ids by paging through
 * `/products/wishlist` until the server reports no more pages (or the page bound
 * is hit). One page is enough for a typical wishlist; paging covers users with
 * more than `WISHLIST_ID_PAGE_SIZE` favorites without ever exceeding the server's
 * `limit` cap (the previous single `limit=200` request always 400'd).
 */
export async function collectWishlistIds(
  fetchPage: (page: number, limit: number) => Promise<PaginatedResponse<WishlistItem>>,
): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let page = 1; page <= MAX_WISHLIST_ID_PAGES; page++) {
    const res = await fetchPage(page, WISHLIST_ID_PAGE_SIZE);
    for (const id of res.data) {
      ids.add(id.id);
    }
    if (!res.hasNext) break;
  }
  return ids;
}

/**
 * Return a NEW `Set` with `productId` added or removed — used for optimistic
 * wishlist toggles so the heart flips instantly before the mutation settles.
 * Never mutates the input set (React Query cached value must stay immutable).
 */
export function toggleWishlistId(
  ids: Set<string>,
  productId: string,
  shouldBeWishlisted: boolean,
): Set<string> {
  const next = new Set(ids);
  if (shouldBeWishlisted) {
    next.add(productId);
  } else {
    next.delete(productId);
  }
  return next;
}
