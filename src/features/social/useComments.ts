import { useQuery, useMutation } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/query/queryKeys';
import { invalidateCommentViews } from '@/lib/query/socialInvalidation';
import { api } from '@/api';
import type { Comment, CommentTree } from '@/types';

export function useComments(postId: string) {
  return useQuery({
    queryKey: queryKeys.social.comments(postId),
    queryFn: () => api.social.getComments(postId),
    enabled: postId.length > 0,
  });
}

export function useReplies(commentId: string, enabled = false) {
  return useQuery<CommentTree>({
    queryKey: queryKeys.social.replies(commentId),
    queryFn: () => api.social.getReplies(commentId) as Promise<CommentTree>,
    enabled: enabled && commentId.length > 0,
  });
}

export function useCreateComment() {
  return useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      api.social.createComment(postId, { content }),
    onSuccess: (_data: Comment, { postId }) => {
      invalidateCommentViews({ postId });
    },
    onError: (error: unknown) => {
      console.error('Create comment failed', error);
    },
  });
}

export function useCreateReply() {
  return useMutation({
    mutationFn: ({ commentId, content, postId: _postId }: { commentId: string; content: string; postId: string }) =>
      api.social.createReply(commentId, { content, postId: _postId }),
    onSuccess: (_data: Comment, { commentId, postId }) => {
      invalidateCommentViews({ postId, parentCommentId: commentId });
    },
    onError: (error: unknown) => {
      console.error('Create reply failed', error);
    },
  });
}

export function useDeleteComment() {
  return useMutation({
    mutationFn: ({ commentId }: { commentId: string; postId: string; parentCommentId?: string }) =>
      api.social.deleteComment(commentId),
    onSuccess: (_data: unknown, { postId, parentCommentId }) => {
      invalidateCommentViews({ postId, parentCommentId });
    },
    onError: (error: unknown) => {
      console.error('Delete comment failed', error);
    },
  });
}
