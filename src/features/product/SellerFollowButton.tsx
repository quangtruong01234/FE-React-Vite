import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/context/useAuthContext';
import { useIsFollowing, useFollowUser, useUnfollowUser } from '@/features/social/useFollow';
import { cn } from '@/lib/format/utils';
import { sellerFollowState } from './sellerCard';
import { useT } from '@/hooks/ui/useT';
import { productMessages } from './product.i18n';

interface Props {
  sellerId: string;
  sellerExists: boolean;
  className: string;
}

/** "Theo dõi" on the product page's seller card, backed by the social follow graph. */
export function SellerFollowButton({ sellerId, sellerExists, className }: Props): ReactElement | null {
  const navigate = useNavigate();
  const t = useT(productMessages);
  const { currentUser } = useAuthContext();
  const viewerId = currentUser?.id ?? '';

  const { isFollowing, isLoading } = useIsFollowing(viewerId, sellerId);
  const { mutate: follow, isPending: isFollowPending } = useFollowUser(sellerId, viewerId);
  const { mutate: unfollow, isPending: isUnfollowPending } = useUnfollowUser(sellerId, viewerId);
  const isPending = isFollowPending || isUnfollowPending;

  const state = sellerFollowState({ viewerId, sellerId, sellerExists, isFollowing, isLoading });
  if (state === 'hidden') return null;

  function handleClick(): void {
    if (state === 'login') {
      void navigate('/login');
      return;
    }
    if (state === 'following') unfollow();
    else follow();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === 'loading' || isPending}
      aria-pressed={state === 'following'}
      className={cn(className, 'disabled:opacity-50 disabled:cursor-default')}
    >
      {state === 'following' ? t('following') : t('follow')}
    </button>
  );
}
