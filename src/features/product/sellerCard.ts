import type { Product } from '@/types';

/**
 * Where the seller card on `/product/:id` links to — the seller's profile, which
 * carries their "Sản phẩm" tab.
 *
 * `null` when the seller is gone (`user == null`, ENRICH-FAIL-01): the card then
 * reads `SELLER_FALLBACK`, and a link would land on a profile that 404s.
 */
export function sellerProfilePath(product: Pick<Product, 'user' | 'userId'>): string | null {
  return product.user ? `/profile/${product.userId}` : null;
}

export type SellerFollowState = 'hidden' | 'login' | 'loading' | 'follow' | 'following';

interface SellerFollowInput {
  viewerId: string;
  sellerId: string;
  sellerExists: boolean;
  isFollowing: boolean;
  isLoading: boolean;
}

/**
 * What the "Theo dõi" button on the seller card shows.
 *
 * Signed out it stays visible and sends the visitor to `/login` — the same
 * contract as the "Chat" button next to it — rather than disappearing.
 */
export function sellerFollowState({
  viewerId,
  sellerId,
  sellerExists,
  isFollowing,
  isLoading,
}: SellerFollowInput): SellerFollowState {
  if (!sellerExists || viewerId === sellerId) return 'hidden';
  if (viewerId.length === 0) return 'login';
  if (isLoading) return 'loading';
  return isFollowing ? 'following' : 'follow';
}
