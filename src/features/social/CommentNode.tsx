import { useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Send, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Avatar } from '@/components/shared/Avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useRole } from '@/hooks/auth/useRole';
import { useReplies, useCreateReply, useDeleteComment } from './useComments';
import { commentAuthorView } from './commentAuthor';
import { cn } from '@/lib/format/utils';
import { relativeTimeShort } from '@/lib/format/time';
import type { Comment, CommentTree } from '@/types';

const MAX_DEPTH = 3;

const replySchema = z.object({ content: z.string().min(1) });
type ReplyFormData = z.infer<typeof replySchema>;

interface CommentNodeProps {
  comment: Comment | CommentTree;
  postId: string;
  depth?: number;
  parentCommentId?: string;
}

export function CommentNode({
  comment,
  postId,
  depth = 0,
  parentCommentId,
}: CommentNodeProps): ReactElement {
  const role = useRole();
  const meId = role?.me?.id;

  const [replying, setReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  const { data: repliesData, isLoading: repliesLoading } = useReplies(comment.id, showReplies);
  const createReply = useCreateReply();
  const deleteComment = useDeleteComment();

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<ReplyFormData>({
    resolver: zodResolver(replySchema),
  });

  const replyCount = repliesData ? repliesData.children.length : (comment.replyCount ?? 0);
  const isOwn = meId !== undefined && meId === comment.userId;
  const { displayName, avatarSrc } = commentAuthorView(comment.author);

  async function onReplySubmit(data: ReplyFormData): Promise<void> {
    await createReply.mutateAsync({ commentId: comment.id, content: data.content, postId });
    reset();
    setReplying(false);
    setShowReplies(true);
  }

  function handleDelete(): void {
    if (!window.confirm('Xoá bình luận này?')) return;
    deleteComment.mutate({
      commentId: comment.id,
      postId,
      parentCommentId,
    });
  }

  const replies = repliesData?.children ?? [];

  return (
    <div className={cn(depth > 0 && 'ml-5 pl-4 border-l border-bdr')}>
      <div className="flex gap-2.5 py-2">
        <Link to={`/profile/${comment.userId}`}>
          <Avatar src={avatarSrc} alt={displayName} size={34} />
        </Link>
        <div className="flex-1 min-w-0">
          {/* Bubble */}
          <div className="inline-block bg-canvas-elevated rounded-2xl rounded-tl-md px-3.5 py-2 max-w-full">
            <Link
              to={`/profile/${comment.userId}`}
              className="font-semibold text-[13px] text-ink-pri block hover:text-accent-amber transition-colors"
            >
              {displayName}
            </Link>
            <p className="m-0 text-sm text-ink-pri leading-snug break-words">
              {comment.content}
            </p>
          </div>

          {/* Action row */}
          <div className="flex items-center gap-4 mt-1 ml-1 text-xs font-semibold text-ink-muted">
            <span>{relativeTimeShort(comment.createdAt)}</span>
            {depth < MAX_DEPTH && (
              <button
                type="button"
                onClick={() => setReplying((r) => !r)}
                className="bg-transparent border-0 cursor-pointer p-0 hover:text-accent-amber transition-colors"
              >
                Trả lời
              </button>
            )}
            {isOwn && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteComment.isPending}
                className="bg-transparent border-0 cursor-pointer p-0 hover:text-accent-red transition-colors flex items-center gap-1"
              >
                <Trash2 size={11} /> Xoá
              </button>
            )}
          </div>

          {/* Reply input */}
          {replying && (
            <form
              onSubmit={(e) => void handleSubmit(onReplySubmit)(e)}
              className="flex items-center gap-2 mt-2"
            >
              <Avatar size={28} />
              <input
                {...register('content')}
                autoFocus
                placeholder="Trả lời bình luận…"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setReplying(false);
                }}
                className="flex-1 bg-canvas-elevated border border-bdr rounded-full px-3.5 py-2 text-sm text-ink-pri placeholder:text-ink-muted outline-none focus:border-tb-amber/50"
              />
              <button
                type="submit"
                disabled={isSubmitting || createReply.isPending}
                className="text-accent-amber bg-transparent border-0 cursor-pointer p-1.5 disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </form>
          )}

          {/* Show/hide replies */}
          {(replyCount > 0 || showReplies) && (
            <div className="mt-1">
              {!showReplies && (
                <button
                  type="button"
                  onClick={() => setShowReplies(true)}
                  className="text-xs font-semibold text-accent-amber bg-transparent border-0 cursor-pointer p-0 hover:underline"
                >
                  Xem tất cả {replyCount} phản hồi
                </button>
              )}
              {showReplies && repliesLoading && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <Skeleton className="h-4 w-48 bg-canvas-elevated rounded" />
                  <Skeleton className="h-4 w-36 bg-canvas-elevated rounded" />
                </div>
              )}
              {showReplies && !repliesLoading && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowReplies(false)}
                    className="text-xs font-semibold text-ink-muted bg-transparent border-0 cursor-pointer p-0 hover:text-accent-amber transition-colors mb-1"
                  >
                    Ẩn phản hồi
                  </button>
                  {replies.map((reply) => (
                    <CommentNode
                      key={reply.id}
                      comment={reply}
                      postId={postId}
                      depth={depth + 1}
                      parentCommentId={comment.id}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
