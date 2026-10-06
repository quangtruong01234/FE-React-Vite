import { useState, type ReactElement } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Pencil, MessageCircle, Mail, Shield, CheckCircle, Newspaper, Package, UserCheck } from 'lucide-react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Avatar } from '@/components/shared/Avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { GradientButton } from '@/components/shared/GradientButton';
import { IconButton } from '@/components/shared/IconButton';
import { EditProfileModal } from './EditProfileModal';
import { profileContactInfo } from './profileAbout';
import { FollowListModal } from './FollowListModal';
import PostCard from '@/features/social/PostCard';
import ProductCard from '@/features/product/ProductCard';
import { useProducts } from '@/features/product/useProducts';
import { useFollowers, useFollowing, useFollowUser, useUnfollowUser, useIsFollowing } from '@/features/social/useFollow';
import { useAuthContext } from '@/context/useAuthContext';
import { useLanguage } from '@/context/useLanguage';
import { useT } from '@/hooks/ui/useT';
import { userMessages } from './user.i18n';
import { queryKeys } from '@/hooks/query/queryKeys';
import { usePageParam } from '@/hooks/ui/usePageParam';
import { Pagination } from '@/components/shared/Pagination';
import { FetchingOverlay } from '@/components/shared/FetchingOverlay';
import { SearchField } from '@/components/shared/SearchField';
import { useListSearch, listSearchEmptyText } from '@/hooks/ui/useListSearch';
import { api } from '@/api';
import { cn } from '@/lib/format/utils';
import { userDisplayName, userFallback } from '@/lib/format/user';

const PAGE_SIZE = 10;

type TabKey = 'posts' | 'products' | 'about' | 'following';

// Keyed by the profile id: /profile/:id reuses the element across profiles, so
// without the key a posts search typed on one profile would filter the next.
export default function ProfilePageRoute(): ReactElement {
  const { id } = useParams<{ id: string }>();
  return <ProfilePage key={id} userId={id ?? ''} />;
}

function ProfilePage({ userId }: { userId: string }): ReactElement {

  const { currentUser } = useAuthContext();
  const viewerId = currentUser?.id ?? '';
  const isMe = viewerId.length > 0 && viewerId === userId;

  const navigate = useNavigate();
  const { lang } = useLanguage();
  const t = useT(userMessages);
  const [tab, setTab] = useState<TabKey>('posts');
  const [editing, setEditing] = useState(false);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);
  // Pages live in the URL; <Link> to another profile drops the query string,
  // so pagination naturally resets when navigating between profiles.
  const [postsPageNum, setPostsPageNum] = usePageParam('postsPage');
  const [productsPageNum, setProductsPageNum] = usePageParam('productsPage');
  const postsSearch = useListSearch(() => {
    if (postsPageNum !== 1) setPostsPageNum(1);
  });
  const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null);

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
    enabled: userId.length > 0,
  });

  // email/role are private — only shown on your own profile, sourced from /user/me.
  const contactInfo = profileContactInfo(isMe, currentUser);

  const { data: postsPage, isLoading: postsLoading, isFetching: postsFetching } = useQuery({
    queryKey: queryKeys.social.postsByUser(userId, postsPageNum, postsSearch.term),
    queryFn: () => api.social.getPostsByUser(userId, postsPageNum, PAGE_SIZE, postsSearch.term),
    enabled: postsLoaded && userId.length > 0,
    // Keep the previous page rendered while the next one loads (no empty flash).
    placeholderData: keepPreviousData,
  });

  const posts = postsPage?.data ?? [];
  const postsTotal = postsPage?.total ?? 0;
  const postsTotalPages = postsPage?.totalPages ?? 0;

  const { data: productsPage, isLoading: productsLoading, isFetching: productsFetching } = useProducts(
    { userId, page: productsPageNum, limit: PAGE_SIZE, isActive: true },
    { enabled: productsLoaded && userId.length > 0 },
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
      : t('userNotFound');
    return (
      <div className="max-w-[680px] mx-auto">
        <div className="bg-tb-red/10 border border-accent-red text-accent-red px-4 py-3 rounded-xl text-sm">
          {msg}
        </div>
      </div>
    );
  }

  const displayName = userDisplayName(user, userFallback(lang), lang);

  const withCount = (label: string, count: number): string =>
    count > 0 ? t('withCount', { label, count }) : label;
  const TABS: { key: TabKey; label: string }[] = [
    { key: 'posts', label: withCount(t('tabPosts'), postsTotal) },
    { key: 'following', label: withCount(t('tabFollowing'), followingCount) },
    { key: 'products', label: withCount(t('tabProducts'), productsTotal) },
    { key: 'about', label: t('tabAbout') },
  ];

  return (
    <div className="max-w-[680px] mx-auto">
      {/* Cover */}
      <div className="relative h-44 rounded-tb-card overflow-hidden bg-login-left border border-bdr" />

      {/* Avatar + name row */}
      <div className="px-4 -mt-12 relative">
        <div className="flex items-end gap-4 mb-3">
          <Avatar src={user.avatar ?? undefined} alt={displayName} size={96} />
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="font-display font-black text-2xl text-ink-pri m-0 truncate">
              {displayName}
            </h1>
            <p className="text-sm text-ink-muted m-0">@{user.username}</p>
            {/* Follower / following counts */}
            <div className="flex gap-4 mt-1.5">
              <button
                type="button"
                onClick={() => setFollowModal('followers')}
                className="text-xs text-ink-sec hover:text-ink-pri transition-colors cursor-pointer border-0 bg-transparent p-0"
              >
                <span className="font-semibold text-ink-pri">{followersCount}</span> {t('followerCount', { count: followersCount })}
              </button>
              <button
                type="button"
                onClick={() => setFollowModal('following')}
                className="text-xs text-ink-sec hover:text-ink-pri transition-colors cursor-pointer border-0 bg-transparent p-0"
              >
                <span className="font-semibold text-ink-pri">{followingCount}</span> {t('followingCount')}
              </button>
            </div>
          </div>
          {isMe ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 bg-canvas-elevated border border-bdr rounded-tb-cta px-3 py-2 text-sm font-semibold text-ink-sec cursor-pointer hover:border-tb-amber/50 transition-colors flex-none mb-1"
            >
              <Pencil size={13} className="shrink-0" />
              {t('editProfile')}
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
                  className="flex items-center gap-1.5 bg-canvas-elevated border border-bdr rounded-full px-4 py-2 text-sm font-semibold text-ink-pri cursor-pointer hover:border-tb-red/50 hover:text-accent-red transition-colors disabled:opacity-50"
                >
                  <UserCheck size={14} className="shrink-0" />
                  {t('following')}
                </button>
              ) : (
                <GradientButton
                  size="sm"
                  className="rounded-full"
                  onClick={() => follow()}
                  disabled={isFollowPending || viewerId.length === 0}
                >
                  {t('follow')}
                </GradientButton>
              )}
              <IconButton
                onClick={() => void navigate('/messages', { state: { otherUserId: userId } })}
                className="size-9 bg-canvas-elevated border border-bdr rounded-full text-ink-sec hover:border-tb-amber/50 transition-colors"
                aria-label={t('message')}
              >
                <MessageCircle size={15} className="shrink-0" />
              </IconButton>
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
                ? 'bg-tb-gradient text-ink-on-accent border-transparent'
                : 'bg-canvas-elevated border-bdr text-ink-sec hover:border-tb-amber/50',
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
            <SearchField
              value={postsSearch.input}
              onChange={postsSearch.setInput}
              placeholder={t('searchPosts')}
              className="mb-4"
            />
            {postsLoading && (
              <div className="flex flex-col gap-4">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-tb-card bg-canvas-elevated" />
                ))}
              </div>
            )}
            {!postsLoading && posts.length === 0 && (
              <div className="bg-canvas-surface border border-bdr rounded-tb-card py-14 flex flex-col items-center gap-2 text-center">
                <Newspaper size={32} className="text-ink-muted shrink-0" />
                <p className="text-sm text-ink-sec m-0">
                  {listSearchEmptyText(postsSearch, t('postsNoun'), lang) ?? t('noPosts')}
                </p>
              </div>
            )}
            {!postsLoading && posts.length > 0 && (
              <FetchingOverlay fetching={postsFetching && !postsLoading}>
                <div className="flex flex-col gap-4">
                  {posts.map((p) => <PostCard key={p.id} post={p} />)}
                </div>
              </FetchingOverlay>
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
                <UserCheck size={32} className="text-ink-muted shrink-0" />
                <p className="text-sm text-ink-sec m-0">{t('noFollowing')}</p>
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
                <Package size={32} className="text-ink-muted shrink-0" />
                <p className="text-sm text-ink-sec m-0">{t('noProducts')}</p>
              </div>
            )}
            {!productsLoading && products.length > 0 && (
              <FetchingOverlay fetching={productsFetching && !productsLoading}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {products.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              </FetchingOverlay>
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
            {contactInfo && (
              <>
                <div className="flex items-center gap-3 text-sm text-ink-pri">
                  <Mail size={16} className="text-ink-sec flex-none shrink-0" />
                  {contactInfo.email}
                </div>
                <div className="flex items-center gap-3 text-sm text-ink-pri">
                  <Shield size={16} className="text-ink-sec flex-none shrink-0" />
                  {t('role')}
                  <span className="uppercase font-semibold text-accent-amber">{contactInfo.roleName}</span>
                </div>
              </>
            )}
            <div className="flex items-center gap-3 text-sm text-ink-pri">
              <CheckCircle size={16} className="text-ink-sec flex-none shrink-0" />
              {t('status')}
              <span className={user.isActive ? 'text-accent-green' : 'text-ink-muted'}>
                {t(user.isActive ? 'active' : 'inactive')}
              </span>
            </div>
          </div>
        )}
      </div>

      {isMe && currentUser && (
        <EditProfileModal
          open={editing}
          onClose={() => setEditing(false)}
          user={currentUser}
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
