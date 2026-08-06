import { Link } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Avatar } from '@/components/shared/Avatar';
import { Dialog, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { ModalCloseButton } from '@/components/shared/ModalCloseButton';
import { Skeleton } from '@/components/ui/skeleton';
import { useFollowers, useFollowing } from '@/features/social/useFollow';
import type { FollowerItem, FollowingItem } from '@/types';

interface FollowListModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  mode: 'followers' | 'following';
}

export function FollowListModal({ open, onClose, userId, mode }: FollowListModalProps) {
  const followersQuery = useFollowers(userId);
  const followingQuery = useFollowing(userId);

  const query = mode === 'followers' ? followersQuery : followingQuery;
  const title = mode === 'followers' ? 'Người theo dõi' : 'Đang theo dõi';

  const items = query.data?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-canvas-surface border border-bdr rounded-lg text-ink-pri overflow-hidden shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {/* header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-bdr">
            <span className="font-display font-black text-base text-ink-pri">{title}</span>
            <ModalCloseButton onClick={onClose} />
          </div>

          <div className="flex flex-col max-h-[60vh] overflow-y-auto py-2">
            {query.isLoading && (
              <div className="flex flex-col gap-3 px-4 py-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full bg-canvas-elevated" />
                    <Skeleton className="h-4 w-32 rounded bg-canvas-elevated" />
                  </div>
                ))}
              </div>
            )}

            {!query.isLoading && items.length === 0 && (
              <p className="text-center text-sm text-ink-muted py-8">
                {mode === 'followers' ? 'Chưa có người theo dõi' : 'Chưa theo dõi ai'}
              </p>
            )}

            {!query.isLoading && items.map((item) => {
              const user = mode === 'followers'
                ? (item as FollowerItem).user
                : (item as FollowingItem).user;

              return (
                <Link
                  key={user.id}
                  to={`/profile/${user.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-canvas-elevated transition-colors no-underline"
                >
                  <Avatar src={user.avatar ?? undefined} alt={user.username} size={40} />
                  <span className="text-sm font-semibold text-ink-pri">@{user.username}</span>
                </Link>
              );
            })}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
