import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/query/queryClient';
import { queryKeys } from '@/hooks/query/queryKeys';
import { api } from '@/api';
import type { Comment, CommentTree } from '@/types';

export function useComments(postId: number) {
  return useQuery({
    queryKey: queryKeys.social.comments(postId),
    queryFn: () => api.social.getComments(postId),
    enabled: postId > 0,
  });
}

export function useReplies(commentId: number, enabled = false) {
  return useQuery<CommentTree>({
    queryKey: queryKeys.social.replies(commentId),
    queryFn: () => api.social.getReplies(commentId) as Promise<CommentTree>,
    enabled: enabled && commentId > 0,
  });
}

export function useCreateComment() {
  return useMutation({
    mutationFn: ({ postId, content }: { postId: number; content: string }) =>
      api.social.createComment(postId, { content }),
    onSuccess: (_data: Comment, { postId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.comments(postId) });
    },
    onError: (error: unknown) => {
      console.error('Create comment failed', error);
    },
  });
}

export function useCreateReply() {
  return useMutation({
    mutationFn: ({ commentId, content, postId: _postId }: { commentId: number; content: string; postId: number }) =>
      api.social.createReply(commentId, { content, postId: _postId }),
    onSuccess: (_data: Comment, { commentId, postId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.replies(commentId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.comments(postId) });
    },
    onError: (error: unknown) => {
      console.error('Create reply failed', error);
    },
  });
}

export function useDeleteComment() {
  return useMutation({
    mutationFn: ({ commentId }: { commentId: number; postId: number; parentCommentId?: number }) =>
      api.social.deleteComment(commentId),
    onSuccess: (_data: unknown, { postId, parentCommentId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.comments(postId) });
      if (parentCommentId !== undefined) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.social.replies(parentCommentId) });
      }
    },
    onError: (error: unknown) => {
      console.error('Delete comment failed', error);
    },
  });
}
