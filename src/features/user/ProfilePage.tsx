import { useState, useEffect, type ReactElement } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Pencil, MessageCircle, Mail, Shield, CheckCircle, Newspaper, Package, UserCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/shared/Avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { GradientButton } from '@/components/shared/GradientButton';
import { EditProfileModal } from './EditProfileModal';
import { FollowListModal } from './FollowListModal';
import PostCard from '@/features/social/PostCard';
import ProductCard from '@/features/product/ProductCard';
import { useProducts } from '@/features/product/useProducts';
import { useFollowers, useFollowing, useFollowUser, useUnfollowUser, useIsFollowing } from '@/features/social/useFollow';
import { useAuthContext } from '@/context/AuthContext';
import { queryKeys } from '@/hooks/query/queryKeys';
import { Pagination } from '@/components/shared/Pagination';
import { api } from '@/api';
import { cn } from '@/lib/format/utils';

const PAGE_SIZE = 10;

type TabKey = 'posts' | 'products' | 'about' | 'following';

export default function ProfilePage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const userId = Number(id ?? 0);

  const { currentUser } = useAuthContext();
  const viewerId = currentUser?.id ?? 0;
  const isMe = viewerId !== 0 && viewerId === userId;

  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('posts');
  const [editing, setEditing] = useState(false);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [postsPageNum, setPostsPageNum] = useState(1);
  const [productsPageNum, setProductsPageNum] = useState(1);
  const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null);

  // Reset pagination when navigating to a different profile
  useEffect(() => {
    setPostsPageNum(1);
    setProductsPageNum(1);
  }, [userId]);

  const { data: followersData } = useFollowers(userId);
  const { data: followingData } = useFollowing(userId);
  const { isFollowing, isLoading: isFollowLoading } = useIsFollowing(viewerId, userId);

  const { mutate: follow, isPending: isFollowPending } = useFollowUser(userId, viewerId);
  const { mutate: unfollow, isPending: isUnfollowPending } = useUnfollowUser(userId, viewerId);

  const followersCount = followersData?.total ?? 0;
  const followingCount = followingData?.total ?? 0;

  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => api.users.getById(userId),
    enabled: userId > 0,
  });

  const { data: postsPage, isLoading: postsLoading } = useQuery({
    queryKey: queryKeys.social.postsByUser(userId, postsPageNum),
    queryFn: () => api.social.getPostsByUser(userId, postsPageNum, PAGE_SIZE),
    enabled: postsLoaded && userId > 0,
  });

  const posts = postsPage?.data ?? [];
  const postsTotal = postsPage?.total ?? 0;
  const postsTotalPages = postsPage?.totalPages ?? 0;

  const { data: productsPage, isLoading: productsLoading } = useProducts(
    { userId, page: productsPageNum, limit: PAGE_SIZE, isActive: true },
    { enabled: productsLoaded && userId > 0 },
  );
  const products = productsPage?.data ?? [];
  const productsTotal = productsPage?.total ?? 0;
  const productsTotalPages = productsPage?.totalPages ?? 0;

  function handleTabChange(next: TabKey): void {
    setTab(next);
    if (next === 'posts') setPostsLoaded(true);
    if (next === 'products') setProductsLoaded(true);
  }

  // Trigger posts load on first render if already on posts tab
  useState(() => { setPostsLoaded(true); });

  if (userLoading) {
    return (
      <div className="max-w-[680px] mx-auto">
        <Skeleton className="h-44 w-full rounded-tb-card bg-canvas-elevated" />
        <div className="px-4 -mt-10 relative flex items-end gap-4 mb-4">
          <Skeleton className="w-24 h-24 rounded-full flex-none bg-canvas-elevated" />
          <div className="flex-1 flex flex-col gap-2 pb-1">
            <Skeleton className="h-6 w-40 bg-canvas-elevated rounded" />
            <Skeleton className="h-4 w-24 bg-canvas-elevated rounded" />
          </div>
        </div>
        <div className="px-4 flex gap-2 mb-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full bg-canvas-elevated" />
          ))}
        </div>
      </div>
    );
  }

  if (userError || !user) {
    const msg = userError && typeof userError === 'object' && 'message' in userError
      ? String((userError as { message: unknown }).message)
      : 'Không tìm thấy người dùng.';
    return (
      <div className="max-w-[680px] mx-auto">
        <div className="bg-red-950/30 border border-accent-red text-accent-red px-4 py-3 rounded-xl text-sm">
          {msg}
        </div>
      </div>
    );
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'posts', label: `Bài viết${postsTotal > 0 ? ` (${postsTotal})` : ''}` },
    { key: 'following', label: `Đang theo dõi${followingCount > 0 ? ` (${followingCount})` : ''}` },
    { key: 'products', label: `Sản phẩm${productsTotal > 0 ? ` (${productsTotal})` : ''}` },
    { key: 'about', label: 'Giới thiệu' },
  ];

  return (
    <div className="max-w-[680px] mx-auto">
      {/* Cover */}
      <div className="relative h-44 rounded-tb-card overflow-hidden bg-login-left border border-bdr" />

      {/* Avatar + name row */}
      <div className="px-4 -mt-12 relative">
        <div className="flex items-end gap-4 mb-3">
          <Avatar src={user.avatar ?? undefined} alt={user.name ?? user.username} size={96} />
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="font-display font-black text-2xl text-ink-pri m-0 truncate">
              {user.name ?? user.username}
            </h1>
            <p className="text-sm text-ink-muted m-0">@{user.username}</p>
            {/* Follower / following counts */}
            <div className="flex gap-4 mt-1.5">
              <button
                type="button"
                onClick={() => setFollowModal('followers')}
                className="text-xs text-ink-sec hover:text-ink-pri transition-colors cursor-pointer border-0 bg-transparent p-0"
              >
                <span className="font-semibold text-ink-pri">{followersCount}</span> người theo dõi
              </button>
              <button
                type="button"
                onClick={() => setFollowModal('following')}
                className="text-xs text-ink-sec hover:text-ink-pri transition-colors cursor-pointer border-0 bg-transparent p-0"
              >
                <span className="font-semibold text-ink-pri">{followingCount}</span> đang theo dõi
              </button>
            </div>
          </div>
          {isMe ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 bg-canvas-elevated border border-bdr rounded-tb-cta px-3 py-2 text-sm font-semibold text-ink-sec cursor-pointer hover:border-accent-amber/50 transition-colors flex-none mb-1"
            >
              <Pencil size={13} />
              Sửa hồ sơ
            </button>
          ) : (
            <div className="flex gap-2 pb-1 flex-none">
              {isFollowLoading ? (
                <Skeleton className="h-9 w-28 rounded-full bg-canvas-elevated" />
              ) : isFollowing ? (
                <button
                  type="button"
                  onClick={() => unfollow()}
                  disabled={isUnfollowPending}
                  className="flex items-center gap-1.5 bg-canvas-elevated border border-bdr rounded-full px-4 py-2 text-sm font-semibold text-ink-pri cursor-pointer hover:border-accent-red/50 hover:text-accent-red transition-colors disabled:opacity-50"
                >
                  <UserCheck size={14} className="shrink-0" />
                  Đang theo dõi
                </button>
              ) : (
                <GradientButton
                  size="sm"
                  className="rounded-full"
                  onClick={() => follow()}
                  disabled={isFollowPending || viewerId === 0}
                >
                  Theo dõi
                </GradientButton>
              )}
              <button
                type="button"
                onClick={() => void navigate('/messages', { state: { otherUserId: userId } })}
                className="bg-canvas-elevated border border-bdr rounded-full w-9 h-9 flex items-center justify-center text-ink-sec hover:border-accent-amber/50 transition-colors"
                aria-label="Nhắn tin"
              >
                <MessageCircle size={15} className="shrink-0" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4 flex gap-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleTabChange(key)}
            className={cn(
              'px-4 py-2 rounded-full font-body font-semibold text-[13px] border cursor-pointer transition-colors',
              tab === key
                ? 'bg-tb-gradient text-ink-pri border-transparent'
                : 'bg-canvas-elevated border-bdr text-ink-sec hover:border-accent-amber/50',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-1">
        {tab === 'posts' && (
          <>
            {postsLoading && (
              <div className="flex flex-col gap-4">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-tb-card bg-canvas-elevated" />
                ))}
              </div>
            )}
            {!postsLoading && posts.length === 0 && (
              <div className="bg-canvas-surface border border-bdr rounded-tb-card py-14 flex flex-col items-center gap-2 text-center">
                <Newspaper size={32} className="text-ink-muted" />
                <p className="text-sm text-ink-sec m-0">Chưa có bài viết nào</p>
              </div>
            )}
            {!postsLoading && posts.length > 0 && (
              <div className="flex flex-col gap-4">
                {posts.map((p) => <PostCard key={p.id} post={p} />)}
              </div>
            )}
            {!postsLoading && (
              <Pagination
                page={postsPageNum}
                totalPages={postsTotalPages}
                onPageChange={setPostsPageNum}
                className="mt-6"
              />
            )}
          </>
        )}

        {tab === 'following' && (
          <div className="bg-canvas-surface border border-bdr rounded-tb-card divide-y divide-bdr">
            {followingData?.data.length === 0 && (
              <div className="py-14 flex flex-col items-center gap-2 text-center">
                <UserCheck size={32} className="text-ink-muted" />
                <p className="text-sm text-ink-sec m-0">Chưa theo dõi ai</p>
              </div>
            )}
            {followingData?.data.map((item) => (
              <Link
                key={item.user.id}
                to={`/profile/${item.user.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-canvas-elevated transition-colors no-underline"
              >
                <Avatar src={item.user.avatar ?? undefined} alt={item.user.username} size={40} />
                <span className="text-sm font-semibold text-ink-pri">@{item.user.username}</span>
              </Link>
            ))}
          </div>
        )}

        {tab === 'products' && (
          <>
            {productsLoading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="aspect-[3/4] w-full rounded-tb-card bg-canvas-elevated" />
                ))}
              </div>
            )}
            {!productsLoading && products.length === 0 && (
              <div className="bg-canvas-surface border border-bdr rounded-tb-card py-14 flex flex-col items-center gap-2 text-center">
                <Package size={32} className="text-ink-muted" />
                <p className="text-sm text-ink-sec m-0">Chưa đăng bán sản phẩm nào</p>
              </div>
            )}
            {!productsLoading && products.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {products.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
            {!productsLoading && (
              <Pagination
                page={productsPageNum}
                totalPages={productsTotalPages}
                onPageChange={setProductsPageNum}
                className="mt-6"
              />
            )}
          </>
        )}

        {tab === 'about' && (
          <div className="bg-canvas-surface border border-bdr rounded-tb-card p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3 text-sm text-ink-pri">
              <Mail size={16} className="text-ink-sec flex-none" />
              {user.email}
            </div>
            <div className="flex items-center gap-3 text-sm text-ink-pri">
              <Shield size={16} className="text-ink-sec flex-none" />
              Vai trò:
              <span className="uppercase font-semibold text-accent-amber">{user.role.rol_name}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-ink-pri">
              <CheckCircle size={16} className="text-ink-sec flex-none" />
              Trạng thái:
              <span className={user.isActive ? 'text-accent-green' : 'text-ink-muted'}>
                {user.isActive ? 'Đang hoạt động' : 'Không hoạt động'}
              </span>
            </div>
          </div>
        )}
      </div>

      {isMe && user && (
        <EditProfileModal
          open={editing}
          onClose={() => setEditing(false)}
          user={user}
        />
      )}

      <FollowListModal
        open={followModal !== null}
        onClose={() => setFollowModal(null)}
        userId={userId}
        mode={followModal ?? 'followers'}
      />

    </div>
  );
}
