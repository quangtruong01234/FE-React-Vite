import type { WishlistItem } from '@/types';

/**
 * Build the membership `Set` of product ids from a wishlist page payload.
 * Coerces ids to `number` (backend bigint columns can serialize as strings) so
 * lookups from `product.id` (a `number`) always match.
 */
export function wishlistIdSet(items: WishlistItem[]): Set<number> {
  return new Set(items.map((item) => Number(item.id)));
}

/**
 * Return a NEW `Set` with `productId` added or removed — used for optimistic
 * wishlist toggles so the heart flips instantly before the mutation settles.
 * Never mutates the input set (React Query cached value must stay immutable).
 */
export function toggleWishlistId(
  ids: Set<number>,
  productId: number,
  shouldBeWishlisted: boolean,
): Set<number> {
  const next = new Set(ids);
  if (shouldBeWishlisted) {
    next.add(productId);
  } else {
    next.delete(productId);
  }
  return next;
}
