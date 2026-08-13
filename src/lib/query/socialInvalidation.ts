import type { QueryClient } from '@tanstack/react-query';
import { queryClient } from '@/lib/query/queryClient';
import { queryKeys } from '@/hooks/query/queryKeys';

/**
 * Which comment views a mutation touched. The post payload carries
 * `commentCount`, so a comment mutation has to refresh the post itself and not
 * just the comment list.
 */
export interface CommentViewScope {
  /** Post whose comment list and `commentCount` changed. */
  postId: string;
  /** Reply thread under this comment, when the mutation touched one. */
  parentCommentId?: string;
}

/** Single place that maps a comment mutation to the query keys it must refresh. */
export function invalidateCommentViews(
  scope: CommentViewScope,
  client: QueryClient = queryClient,
): void {
  // `social.post(id)` is a prefix of `social.comments(id)`, so this one call
  // refreshes both the post header (commentCount) and the comment list.
  // Guarded by the prefix test in `hooks/query/queryKeys.test.ts`.
  void client.invalidateQueries({ queryKey: queryKeys.social.post(scope.postId) });
  if (scope.parentCommentId != null) {
    void client.invalidateQueries({
      queryKey: queryKeys.social.replies(scope.parentCommentId),
    });
  }
}
