import { useState, type ReactElement } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Globe, Heart, MessageCircle, Share2, Send } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/api';
import { queryKeys } from '@/hooks/queryKeys';
import { Avatar } from '@/components/shared/Avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { CommentNode } from './CommentNode';
import { useComments, useCreateComment } from './useComments';
import { useLikePost, useUnlikePost } from './useFeed';
import { cn } from '@/lib/utils';

const commentSchema = z.object({ content: z.string().min(1) });
type CommentFormData = z.infer<typeof commentSchema>;

function relativeTime(iso: string): string {
  const ms = new Date(iso).getTime();
  if (isNaN(ms)) return '';
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function PostDetailPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const postId = Number(id ?? 0);

  const [liked, setLiked] = useState(false);
  const likePost = useLikePost();
  const unlikePost = useUnlikePost();

  const { data: post, isLoading: postLoading, error: postError } = useQuery({
    queryKey: queryKeys.social.post(postId),
    queryFn: () => api.social.getPostById(postId),
    enabled: postId > 0,
  });

  const { data: commentsPage, isLoading: commentsLoading } = useComments(postId);
  const comments = commentsPage?.data ?? [];

  const createComment = useCreateComment();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
  });

  function handleLike(): void {
    if (liked) {
      setLiked(false);
      unlikePost.mutate(postId);
    } else {
      setLiked(true);
      likePost.mutate(postId);
    }
  }

  async function onCommentSubmit(data: CommentFormData): Promise<void> {
    await createComment.mutateAsync({ postId, content: data.content });
    reset();
  }

  if (postLoading) {
    return (
      <div className="max-w-[640px] mx-auto">
        <Skeleton className="h-8 w-24 mb-4 bg-canvas-elevated rounded-lg" />
        <div className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <Skeleton className="w-11 h-11 rounded-full bg-canvas-elevated flex-none" />
            <div className="flex flex-col gap-2 flex-1">
              <Skeleton className="h-4 w-32 bg-canvas-elevated rounded" />
              <Skeleton className="h-3 w-20 bg-canvas-elevated rounded" />
            </div>
          </div>
          <div className="px-4 pb-4 flex flex-col gap-2">
            <Skeleton className="h-4 w-full bg-canvas-elevated rounded" />
            <Skeleton className="h-4 w-3/4 bg-canvas-elevated rounded" />
          </div>
          <Skeleton className="w-full aspect-[3/2] bg-canvas-elevated" />
        </div>
      </div>
    );
  }

  if (postError || !post) {
    const errMsg = postError && typeof postError === 'object' && 'message' in postError
      ? String((postError as { message: unknown }).message)
      : 'Không tìm thấy bài viết.';
    return (
      <div className="max-w-[640px] mx-auto">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 mb-4 bg-canvas-elevated border border-bdr rounded-lg px-3 py-2 text-ink-pri text-sm cursor-pointer hover:border-accent-amber transition-colors"
        >
          <ArrowLeft size={16} /> Bảng tin
        </button>
        <div className="bg-red-950/30 border border-accent-red text-accent-red px-4 py-3 rounded-xl text-sm">
          {errMsg}
        </div>
      </div>
    );
  }

  const displayLikeCount = liked ? post.likeCount + 1 : post.likeCount;

  return (
    <div className="max-w-[640px] mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-1.5 mb-4 bg-canvas-elevated border border-bdr rounded-lg px-3 py-2 text-ink-pri text-sm cursor-pointer hover:border-accent-amber transition-colors"
      >
        <ArrowLeft size={16} /> Bảng tin
      </button>

      <article className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden">
        {/* Author header */}
        <div className="flex items-center gap-3 p-4">
          <Link to={`/profile/${post.userId}`}>
            <Avatar size={44} />
          </Link>
          <div className="flex-1 min-w-0">
            <Link
              to={`/profile/${post.userId}`}
              className="flex items-center gap-1 font-semibold text-[15px] text-ink-pri hover:text-accent-amber transition-colors"
            >
              Người dùng #{post.userId}
            </Link>
            <div className="flex items-center gap-1.5 text-xs text-ink-muted">
              <span>{relativeTime(post.createdAt)}</span>
              <span>·</span>
              <Globe size={11} />
            </div>
          </div>
        </div>

        {/* Content */}
        {post.content && (
          <div className="px-4 pb-3">
            <p className="m-0 text-[15px] leading-relaxed text-ink-pri font-body">
              {post.content}
            </p>
          </div>
        )}

        {/* Images */}
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

        {/* Stats row */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 text-xs text-ink-sec">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-tb-gradient inline-flex items-center justify-center">
              <Heart size={9} color="#fff" />
            </span>
            {displayLikeCount.toLocaleString('vi-VN')}
          </span>
          <span>{comments.length} bình luận</span>
        </div>

        {/* Action row */}
        <div className="flex items-center px-2 py-1 border-t border-b border-bdr mx-2">
          <button
            onClick={handleLike}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg',
              'bg-transparent border-0 cursor-pointer font-semibold text-sm transition-colors',
              liked ? 'text-accent-red' : 'text-ink-sec hover:bg-canvas-elevated',
            )}
          >
            <Heart size={17} className={cn(liked && 'fill-current')} />
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

        {/* Comments */}
        <div className="px-4 py-3">
          <div className="text-sm font-bold text-ink-pri mb-2">
            Bình luận ({comments.length})
          </div>
          {commentsLoading && (
            <div className="flex flex-col gap-3 py-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-2.5">
                  <Skeleton className="w-[34px] h-[34px] rounded-full bg-canvas-elevated flex-none" />
                  <Skeleton className="h-14 flex-1 bg-canvas-elevated rounded-2xl" />
                </div>
              ))}
            </div>
          )}
          {!commentsLoading && comments.length === 0 && (
            <p className="text-sm text-ink-muted py-4 text-center">
              Chưa có bình luận. Hãy là người đầu tiên!
            </p>
          )}
          {!commentsLoading && comments.map((comment) => (
            <CommentNode
              key={comment.id}
              comment={comment}
              postId={postId}
            />
          ))}
        </div>
      </article>

      {/* Sticky comment composer */}
      <div className="sticky bottom-0 bg-canvas-base/90 backdrop-blur-sm py-3 flex items-center gap-2.5 mt-1">
        <Avatar size={36} />
        <form
          onSubmit={(e) => void handleSubmit(onCommentSubmit)(e)}
          className="flex-1 flex items-center gap-2"
        >
          <input
            {...register('content')}
            placeholder="Viết bình luận…"
            className="flex-1 bg-canvas-elevated border border-bdr rounded-full px-4 py-2.5 text-sm text-ink-pri placeholder:text-ink-muted outline-none focus:border-amber-400/50"
          />
          <button
            type="submit"
            disabled={isSubmitting || createComment.isPending}
            className="w-10 h-10 rounded-full bg-tb-gradient text-ink-pri flex items-center justify-center cursor-pointer border-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
