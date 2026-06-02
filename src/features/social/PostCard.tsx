import { useState } from 'react';
import { Globe, Heart, MessageCircle, MoreHorizontal, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/shared/Avatar';
import { useLikePost, useUnlikePost } from './useFeed';
import type { Post } from '@/types';

interface PostCardProps {
  post: Post;
}

function relativeTime(iso: string): string {
  const ms = new Date(iso).getTime();
  if (isNaN(ms)) return '';
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function PostCard({ post }: PostCardProps) {
  const [liked, setLiked] = useState(false);
  const { mutate: likePost } = useLikePost();
  const { mutate: unlikePost } = useUnlikePost();

  function handleLike() {
    if (liked) {
      setLiked(false);
      unlikePost(post.id);
    } else {
      setLiked(true);
      likePost(post.id);
    }
  }

  const displayLikeCount = liked ? post.likeCount + 1 : post.likeCount;
  const time = relativeTime(post.createdAt);

  return (
    <article className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden transition-all duration-300 hover:border-bdr/80">
      {/* header */}
      <div className="flex items-center gap-3 p-3.5">
        <Avatar size={42} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-ink-pri">
            User #{post.userId}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            {time && <span>{time}</span>}
            {time && <span>·</span>}
            <Globe size={11} />
          </div>
        </div>
        <button className="text-ink-sec p-2 rounded-full hover:bg-canvas-elevated transition-colors cursor-pointer border-0 bg-transparent">
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* content */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className="m-0 text-[15px] leading-relaxed text-ink-pri font-body">
            {post.content}
          </p>
        </div>
      )}

      {/* image grid — 1 image: full width, 2+: 2-col grid */}
      {post.imageUrls && post.imageUrls.length > 0 && (
        post.imageUrls.length === 1 ? (
          <img
            src={post.imageUrls[0]}
            alt=""
            className="w-full max-h-[520px] object-cover aspect-[3/2]"
          />
        ) : (
          <div className="grid grid-cols-2 gap-0.5">
            {post.imageUrls.slice(0, 2).map((url, i) => (
              <img key={i} src={url} alt="" className="w-full aspect-square object-cover" />
            ))}
          </div>
        )
      )}

      {/* stats row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 text-xs text-ink-sec">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-tb-gradient inline-flex items-center justify-center">
            <Heart size={9} color="#fff" />
          </span>
          {displayLikeCount.toLocaleString('vi-VN')}
        </span>
      </div>

      {/* action row */}
      <div className="flex items-center px-2 py-1 border-t border-bdr mx-2">
        <button
          onClick={handleLike}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg',
            'bg-transparent border-0 cursor-pointer font-semibold text-sm transition-colors',
            liked ? 'text-accent-red' : 'text-ink-sec hover:bg-canvas-elevated',
          )}
        >
          <Heart
            size={17}
            className={cn(liked && 'fill-current')}
          />
          Thích
        </button>

        <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-transparent border-0 cursor-pointer font-semibold text-sm text-ink-sec hover:bg-canvas-elevated transition-colors">
          <MessageCircle size={17} />
          Bình luận
        </button>

        <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-transparent border-0 cursor-pointer font-semibold text-sm text-ink-sec hover:bg-canvas-elevated transition-colors">
          <Share2 size={17} />
          Chia sẻ
        </button>
      </div>
    </article>
  );
}
