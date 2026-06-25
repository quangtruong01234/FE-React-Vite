import { useProductsByIds } from '@/hooks/useProductsByIds';
import ProductChip from './ProductChip';

interface AttachedProductProps {
  productId: number;
}

/**
 * Hydrates a post's attached product (posts only carry `productId` — P1-03) and
 * renders a {@link ProductChip}. Shares the `cartItems` query cache so repeated
 * ids across the feed dedupe. Renders nothing while loading or if the product
 * was deleted, so a missing attachment never breaks the post.
 */
export function AttachedProduct({ productId }: AttachedProductProps) {
  const { productMap } = useProductsByIds([productId]);
  const product = productMap.get(productId);

  if (!product) return null;

  return (
    <div className="px-4 pb-3">
      <ProductChip product={product} />
    </div>
  );
}
