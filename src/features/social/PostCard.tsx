import { Globe, Heart, MessageCircle, Share2, UserPlus, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from '@/components/shared/IconButton';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/format/utils';
import { cldImage } from '@/lib/http/cloudinaryUrl';
import { preloadImage } from '@/lib/http/preloadImage';
import { Avatar } from '@/components/shared/Avatar';
import { ModalCloseButton } from '@/components/shared/ModalCloseButton';
import { useAuthContext } from '@/context/AuthContext';
import { useLikePost, useUnlikePost } from './useFeed';
import { useIsFollowing, useFollowUser, useUnfollowUser } from './useFollow';
import { useSharePost } from './useSharePost';
import { ShareToast } from './ShareToast';
import { PostActionMenu } from './PostActionMenu';
import { AttachedProduct } from './AttachedProduct';
import { PostImage } from './PostImage';
import { openEditPost } from './composerEvents';
import { relativeTimeShort } from '@/lib/format/time';
import type { Post } from '@/types';

interface PostCardProps {
  post: Post;
  /**
   * First post in the feed: its image is the LCP candidate, so it loads
   * eagerly at high priority. Every other post lazy-loads instead of the
   * previous behaviour (no attribute = eager for the whole feed).
   */
  priority?: boolean;
}

export default function PostCard({ post, priority = false }: PostCardProps) {
  const navigate = useNavigate();
  const { currentUser } = useAuthContext();
  const viewerId = currentUser?.id ?? '';
  const isOwnPost = viewerId.length > 0 && viewerId === post.author.id;

  const { mutate: likePost, isPending: isLiking } = useLikePost();
  const { mutate: unlikePost, isPending: isUnliking } = useUnlikePost();

  const { isFollowing, isLoading: isFollowLoading } = useIsFollowing(viewerId, post.author.id);
  const { mutate: follow, isPending: isFollowPending } = useFollowUser(post.author.id, viewerId);
  const { mutate: unfollow, isPending: isUnfollowPending } = useUnfollowUser(post.author.id, viewerId);

  const { toast, share, copy } = useSharePost();

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  // Stable identity — `?? []` would otherwise hand the callbacks below a fresh
  // array on every render.
  const images = useMemo(() => post.imageUrls ?? [], [post.imageUrls]);

  const openLightbox = useCallback((e: React.MouseEvent, i: number) => {
    e.stopPropagation();
    setLightboxIndex(i);
  }, []);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  // The tile and the lightbox request different derivatives, so the click would
  // otherwise start a fresh round-trip. Hover is the intent signal — warm it.
  const warmLightbox = useCallback((i: number) => {
    preloadImage(cldImage(images[i], 1600));
  }, [images]);

  const goPrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : null));
  }, [images.length]);

  const goNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxIndex((i) => (i !== null ? (i + 1) % images.length : null));
  }, [images.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : null));
      if (e.key === 'ArrowRight') setLightboxIndex((i) => (i !== null ? (i + 1) % images.length : null));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, images.length, closeLightbox]);

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    if (isLiking || isUnliking) return;
    if (post.isLiked) {
      unlikePost(post.id);
    } else {
      likePost(post.id);
    }
  }

  function handleFollowToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (isFollowPending || isUnfollowPending) return;
    if (isFollowing) {
      unfollow();
    } else {
      follow();
    }
  }

  const time = relativeTimeShort(post.createdAt);
  const authorName = post.author.name ?? post.author.username;

  return (
    <article className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden transition-all duration-300 hover:border-bdr/80">
      {/* header */}
      <div className="flex items-center gap-3 p-4">
        <Link to={`/profile/${post.author.id}`} onClick={(e) => e.stopPropagation()}>
          <Avatar src={post.author.avatar ?? undefined} alt={authorName} size={48} />
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            to={`/profile/${post.author.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-[17px] text-ink-pri hover:underline no-underline"
          >
            {authorName}
          </Link>
          <div className="flex items-center gap-1.5 text-[13px] text-ink-muted">
            {time && <span>{time}</span>}
            {time && <span>·</span>}
            <Globe size={13} className="shrink-0" />
          </div>
        </div>

        {/* Follow toggle — only show for other users when logged in */}
        {!isOwnPost && viewerId.length > 0 && !isFollowLoading && (
          <button
            type="button"
            onClick={handleFollowToggle}
            disabled={isFollowPending || isUnfollowPending}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-50',
              isFollowing
                ? 'bg-canvas-elevated border-bdr text-ink-sec hover:border-accent-red/50 hover:text-accent-red'
                : 'bg-tb-gradient border-transparent text-white hover:opacity-90',
            )}
          >
            {isFollowing ? (
              <><UserCheck size={12} className="shrink-0" /> Đang theo dõi</>
            ) : (
              <><UserPlus size={12} className="shrink-0" /> Theo dõi</>
            )}
          </button>
        )}

        <PostActionMenu
          postId={post.id}
          isOwner={isOwnPost}
          canReport={viewerId.length > 0}
          onCopyLink={() => void copy(post.id)}
          onEdit={() => openEditPost(post)}
        />
      </div>

      {/* content */}
      {post.content && (
        <div className="px-5 pb-4">
          <p className="m-0 text-[18px] leading-relaxed text-ink-pri font-body">
            {post.content}
          </p>
        </div>
      )}

      {/* attached product */}
      {post.productId != null && <AttachedProduct productId={post.productId} />}

      {/* image grid */}
      {images.length > 0 && (
        images.length === 1 ? (
          <button
            type="button"
            onClick={(e) => openLightbox(e, 0)}
            onMouseEnter={() => warmLightbox(0)}
            className="w-full bg-black flex items-center justify-center aspect-[4/3] max-h-[520px] overflow-hidden border-0 p-0 cursor-pointer"
          >
            {/* Fixed aspect reserves the slot before the image loads → no feed CLS. */}
            <PostImage
              src={images[0]}
              width={1200}
              className="max-w-full max-h-full object-contain"
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
            />
          </button>
        ) : images.length === 3 ? (
          <div className="grid grid-cols-2 gap-0.5">
            <button
              type="button"
              onClick={(e) => openLightbox(e, 0)}
              onMouseEnter={() => warmLightbox(0)}
              className="bg-black row-span-2 overflow-hidden border-0 p-0 cursor-pointer"
            >
              <PostImage
                src={images[0]}
                width={800}
                className="w-full h-full object-cover"
                loading={priority ? 'eager' : 'lazy'}
                fetchPriority={priority ? 'high' : 'auto'}
              />
            </button>
            {images.slice(1, 3).map((url, i) => (
              <button
                key={i + 1}
                type="button"
                onClick={(e) => openLightbox(e, i + 1)}
                onMouseEnter={() => warmLightbox(i + 1)}
                className="bg-black aspect-square overflow-hidden border-0 p-0 cursor-pointer"
              >
                <PostImage src={url} width={600} className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        ) : (
          <div className={cn('grid gap-0.5', images.length === 2 ? 'grid-cols-2' : 'grid-cols-2')}>
            {images.slice(0, 4).map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => openLightbox(e, i)}
                onMouseEnter={() => warmLightbox(i)}
                className="bg-black aspect-square overflow-hidden border-0 p-0 cursor-pointer"
              >
                <PostImage
                  src={url}
                  width={600}
                  className="w-full h-full object-cover"
                  loading={priority && i === 0 ? 'eager' : 'lazy'}
                  fetchPriority={priority && i === 0 ? 'high' : 'auto'}
                />
              </button>
            ))}
          </div>
        )
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && createPortal(
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close */}
          <ModalCloseButton
            onClick={closeLightbox}
            className="absolute top-4 right-4 size-9 bg-white/10 hover:bg-white/25 text-white z-10"
          />

          {/* Prev */}
          {images.length > 1 && (
            <IconButton
              onClick={goPrev}
              className="absolute left-4 size-10 rounded-full bg-white/10 hover:bg-white/25 text-white border-0 cursor-pointer transition-colors z-10"
            >
              <ChevronLeft size={22} className="shrink-0" />
            </IconButton>
          )}

          {/* Image */}
          <PostImage
            src={images[lightboxIndex]}
            width={1600}
            className="max-w-[90vw] max-h-[90vh] object-contain select-none cursor-default"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          {images.length > 1 && (
            <IconButton
              onClick={goNext}
              className="absolute right-4 size-10 rounded-full bg-white/10 hover:bg-white/25 text-white border-0 cursor-pointer transition-colors z-10"
            >
              <ChevronRight size={22} className="shrink-0" />
            </IconButton>
          )}

          {/* Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm font-body">
              {lightboxIndex + 1} / {images.length}
            </div>
          )}
        </div>,
        document.body,
      )}

      {/* stats row */}
      <div className="flex items-center justify-between px-5 pt-3 pb-2 text-[13px] text-ink-sec">
        <span className="flex items-center gap-1.5">
          <span className="size-5 rounded-full bg-tb-gradient grid place-items-center">
            <Heart size={11} className="shrink-0 text-white" />
          </span>
          {post.likeCount.toLocaleString('vi-VN')}
        </span>
        {post.commentCount > 0 && (
          <span>{post.commentCount.toLocaleString('vi-VN')} bình luận</span>
        )}
      </div>

      {/* action row */}
      <div className="flex items-center px-2 py-1 border-t border-bdr mx-2">
        <button
          onClick={handleLike}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg',
            'bg-transparent border-0 cursor-pointer font-semibold text-[16px] transition-colors overflow-visible',
            post.isLiked ? 'text-accent-red' : 'text-ink-sec hover:bg-canvas-elevated',
          )}
        >
          <Heart
            size={19}
            className={cn('shrink-0', post.isLiked && 'fill-current')}
          />
          Thích
        </button>

        <button
          onClick={() => void navigate(`/post/${post.id}`)}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-transparent border-0 cursor-pointer font-semibold text-[16px] text-ink-sec hover:bg-canvas-elevated transition-colors overflow-visible">
          <MessageCircle size={19} className="shrink-0" />
          Bình luận
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); void share(post.id); }}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-transparent border-0 cursor-pointer font-semibold text-[16px] text-ink-sec hover:bg-canvas-elevated transition-colors overflow-visible">
          <Share2 size={19} className="shrink-0" />
          Chia sẻ
        </button>
      </div>

      <ShareToast message={toast} />
    </article>
  );
}
