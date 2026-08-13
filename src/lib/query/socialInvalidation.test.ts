import { describe, it, expect, vi } from 'vitest';
import type { QueryClient } from '@tanstack/react-query';
import { invalidateCommentViews } from './socialInvalidation';
import { queryKeys } from '@/hooks/query/queryKeys';

function fakeClient(): { client: QueryClient; invalidate: ReturnType<typeof vi.fn> } {
  const invalidate = vi.fn().mockResolvedValue(undefined);
  return { client: { invalidateQueries: invalidate } as unknown as QueryClient, invalidate };
}

describe('invalidateCommentViews', () => {
  // Regression guard: a new comment used to invalidate only the comment list,
  // so the post header kept rendering the stale `commentCount` (0) until reload.
  it('top-level comment refreshes the post (commentCount) and nothing else', () => {
    const { client, invalidate } = fakeClient();
    invalidateCommentViews({ postId: 'post_1' }, client);
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.social.post('post_1') });
  });

  it('reply also refreshes the parent comment thread', () => {
    const { client, invalidate } = fakeClient();
    invalidateCommentViews({ postId: 'post_1', parentCommentId: 'cmt_9' }, client);
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.social.post('post_1') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.social.replies('cmt_9') });
  });

  it('does not invalidate the comment list separately — the post key already covers it', () => {
    const { client, invalidate } = fakeClient();
    invalidateCommentViews({ postId: 'post_1' }, client);
    expect(invalidate).not.toHaveBeenCalledWith({
      queryKey: queryKeys.social.comments('post_1'),
    });
  });
});
