import { Globe, Heart, MessageCircle, MoreHorizontal, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { mutate: likePost, isPending: isLiking } = useLikePost();
  const { mutate: unlikePost, isPending: isUnliking } = useUnlikePost();

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    if (isLiking || isUnliking) return;
    if (post.isLiked) {
      unlikePost(post.id);
    } else {
      likePost(post.id);
    }
  }

  const time = relativeTime(post.createdAt);
  const authorName = post.author.name ?? post.author.username;

  return (
    <article className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden transition-all duration-300 hover:border-bdr/80">
      {/* header */}
      <div className="flex items-center gap-3 p-4">
        <Avatar src={post.author.avatar ?? undefined} alt={authorName} size={48} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[17px] text-ink-pri">
            {authorName}
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-ink-muted">
            {time && <span>{time}</span>}
            {time && <span>·</span>}
            <Globe size="13" />
          </div>
        </div>
        <button className="text-ink-sec p-2 rounded-full hover:bg-canvas-elevated transition-colors cursor-pointer border-0 bg-transparent overflow-visible">
          <MoreHorizontal size="20" />
        </button>
      </div>

      {/* content */}
      {post.content && (
        <div className="px-5 pb-4">
          <p className="m-0 text-[18px] leading-relaxed text-ink-pri font-body">
            {post.content}
          </p>
        </div>
      )}

      {/* image grid */}
      {post.imageUrls && post.imageUrls.length > 0 && (
        post.imageUrls.length === 1 ? (
          <div className="bg-black flex items-center justify-center max-h-[520px] overflow-hidden">
            <img
              src={post.imageUrls[0]}
              alt=""
              className="max-w-full max-h-[520px] object-contain"
            />
          </div>
        ) : (
          <div className={cn('grid gap-0.5', post.imageUrls.length === 2 ? 'grid-cols-2' : post.imageUrls.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
            {post.imageUrls.slice(0, 4).map((url, i) => (
              <div key={i} className="bg-black aspect-square overflow-hidden flex items-center justify-center">
                <img src={url} alt="" className="max-w-full max-h-full object-contain" />
              </div>
            ))}
          </div>
        )
      )}

      {/* stats row */}
      <div className="flex items-center justify-between px-5 pt-3 pb-2 text-[13px] text-ink-sec">
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-tb-gradient inline-flex items-center justify-center">
            <Heart size="11" color="#fff" />
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
            size="19"
            className={cn(post.isLiked && 'fill-current')}
          />
          Thích
        </button>

        <button
          onClick={() => void navigate(`/post/${post.id}`)}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-transparent border-0 cursor-pointer font-semibold text-[16px] text-ink-sec hover:bg-canvas-elevated transition-colors overflow-visible">
          <MessageCircle size="19" />
          Bình luận
        </button>

        <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-transparent border-0 cursor-pointer font-semibold text-[16px] text-ink-sec hover:bg-canvas-elevated transition-colors overflow-visible">
          <Share2 size="19" />
          Chia sẻ
        </button>
      </div>
    </article>
  );
}
