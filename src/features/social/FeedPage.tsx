import { useEffect, useRef, useState } from 'react';
import { Image, PenLine } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/context/AuthContext';
import { Avatar } from '@/components/shared/Avatar';
import { useFeed } from './useFeed';
import PostCard from './PostCard';
import CreatePostModal from './CreatePostModal';
import type { Post } from '@/types';

const TABS = [
  { id: 'for-you', label: 'Dành cho bạn' },
  { id: 'following', label: 'Đang theo dõi' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function FeedPage() {
  const { currentUser } = useAuthContext();
  const [activeTab, setActiveTab] = useState<TabId>('for-you');
  const [showModal, setShowModal] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useFeed();

  // Flatten pages → posts once, O(n) total
  const posts: Post[] = data?.pages.flatMap((page) => page.data) ?? [];

  // IntersectionObserver — trigger fetchNextPage when sentinel scrolls into view
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const userName = currentUser?.name ?? currentUser?.username ?? 'bạn';

  return (
    <div className="min-h-screen bg-canvas-base">
      <div className="max-w-[600px] mx-auto px-4 py-6 flex flex-col gap-4">

        {/* Composer bar — matches design: avatar + pill input + ảnh shortcut */}
        <div className="flex items-center gap-3 bg-canvas-surface border border-bdr rounded-tb-card px-4 py-3">
          <Avatar src={currentUser?.avatar ?? undefined} alt={userName} size={40} />
          <button
            onClick={() => setShowModal(true)}
            className="flex-1 text-left bg-canvas-elevated border border-bdr rounded-full px-4 py-2.5 text-ink-muted text-sm cursor-pointer hover:border-tb-muted transition-colors font-body"
          >
            {userName} ơi, bạn đang nghĩ gì?
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 text-accent-green font-semibold text-sm bg-transparent border-0 cursor-pointer px-2 font-body"
          >
            <Image size={18} />
            Ảnh
          </button>
        </div>

        <CreatePostModal open={showModal} onClose={() => setShowModal(false)} />

        {/* Tabs — sticky with backdrop blur */}
        <div className="sticky top-[72px] z-40 -mx-1 px-1 py-1 bg-canvas-base/80 backdrop-blur-sm">
          <div className="flex gap-1 bg-canvas-surface border border-bdr rounded-tb-card p-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 py-2 text-sm font-semibold font-body rounded-tb-input cursor-pointer border-0 transition-colors',
                  activeTab === tab.id
                    ? 'bg-canvas-elevated text-ink-pri'
                    : 'bg-transparent text-ink-muted hover:text-ink-sec',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading — skeleton cards */}
        {isLoading && (
          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-canvas-surface border border-bdr rounded-tb-card p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <Skeleton className="h-3 w-32 rounded-tb-pill" />
                    <Skeleton className="h-2.5 w-20 rounded-tb-pill" />
                  </div>
                </div>
                <Skeleton className="h-16 w-full rounded-tb-input" />
                <Skeleton className="h-48 w-full rounded-tb-cta" />
              </div>
            ))}
          </div>
        )}

        {/* Error banner */}
        {isError && (
          <div className="rounded-tb-card border border-accent-red/30 bg-accent-red/10 px-4 py-3 text-sm font-body text-accent-red">
            {error instanceof Error ? error.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.'}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && posts.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-canvas-elevated flex items-center justify-center">
              <PenLine size={24} className="text-ink-muted" />
            </div>
            <p className="text-ink-pri font-semibold font-body">Chưa có bài viết</p>
            <p className="text-ink-muted text-sm font-body">Hãy là người đầu tiên chia sẻ điều gì đó!</p>
          </div>
        )}

        {/* Post list */}
        {!isLoading && posts.length > 0 && (
          <div className="flex flex-col gap-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-px" />

        {/* Fetching next page indicator */}
        {isFetchingNextPage && (
          <Skeleton className="h-32 w-full rounded-tb-card" />
        )}

      </div>
    </div>
  );
}
