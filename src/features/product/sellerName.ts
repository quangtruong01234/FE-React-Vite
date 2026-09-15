import { nonBlank } from '@/lib/format/user';
import type { Product } from '@/types';

/**
 * Shown when a product has no resolvable seller.
 *
 * Since ENRICH-FAIL-01 (BE, live on prod 2026-08-28) a missing `user` has
 * exactly one meaning: the seller is really gone. A user-service outage is now
 * a `502`/`408` the caller can catch, not a `200` with the seller quietly
 * missing. The old `'Shop Official'` fallback was written for that flaky case
 * and now does the opposite of its job — it invents a plausible shop name over
 * a real data state, so a deleted seller reads as an ordinary listing.
 */
export const SELLER_FALLBACK = 'Người bán không còn tồn tại';

/**
 * Display name for a product's seller.
 *
 * `user` wins over `brand` because this labels the *shop* — it sits next to the
 * shop avatar and the "xem shop" affordance. `brand` is a catalog attribute
 * ("Samsung"), so it is a last resort before the neutral fallback rather than
 * the preferred answer.
 *
 * Deliberately NOT `userDisplayName()`: here `user.name` carries the
 * *username* (ENRICH-BATCH-01 made the batch route return it so the field is
 * never null), the opposite of the social embed where `name` is a real, nullable
 * display name. Same key, two meanings — one helper for both would be a bug.
 */
export function sellerName(product: Pick<Product, 'user' | 'brand'>): string {
  return (
    nonBlank(product.user?.name) ?? nonBlank(product.brand?.name) ?? SELLER_FALLBACK
  );
}
