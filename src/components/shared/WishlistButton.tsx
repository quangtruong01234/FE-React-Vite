import { type ReactElement, type MouseEvent } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/format/utils';
import { IconButton } from '@/components/shared/IconButton';
import { useWishlistIds, useToggleWishlist } from '@/hooks/data/useWishlist';

interface WishlistButtonProps {
  productId: number;
  /** Container styling (size + shape + background). Icon color is handled here. */
  className?: string;
  iconSize?: number;
}

/**
 * Heart toggle that favorites/unfavorites a product. Reads the shared wishlist
 * membership set for its filled/empty state and fires an optimistic toggle.
 * Safe to nest inside a `<Link>` — the click never bubbles to navigation.
 */
export function WishlistButton({ productId, className, iconSize = 20 }: WishlistButtonProps): ReactElement {
  const { data: ids } = useWishlistIds();
  const toggle = useToggleWishlist();
  const wishlisted = ids?.has(productId) ?? false;

  function handleClick(e: MouseEvent<HTMLButtonElement>): void {
    e.preventDefault();
    e.stopPropagation();
    toggle.mutate({ productId, wishlisted });
  }

  return (
    <IconButton
      onClick={handleClick}
      disabled={toggle.isPending}
      aria-label={wishlisted ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
      aria-pressed={wishlisted}
      className={cn(
        'transition-colors',
        wishlisted ? 'text-accent-red' : 'text-ink-sec hover:text-accent-red',
        className,
      )}
    >
      <Heart size={iconSize} className={cn('shrink-0', wishlisted && 'fill-current')} />
    </IconButton>
  );
}
