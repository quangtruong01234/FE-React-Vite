import type { InfiniteData } from '@tanstack/react-query';
import type { PaginatedResponse, Post } from '@/types';

// Pure cache transforms for the for-you feed. There is one infinite query per
// search term (`queryKeys.social.feed(search)`), so a like/edit/delete patches
// every one of them through `feedAll` — these helpers are what each gets.

export type FeedCache = InfiniteData<PaginatedResponse<Post>>;

export function patchFeedPost(
  cache: FeedCache | undefined,
  postId: string,
  patch: Partial<Post>,
): FeedCache | undefined {
  if (!cache) return cache;
  return {
    ...cache,
    pages: cache.pages.map((page) => ({
      ...page,
      data: page.data.map((post) => (post.id === postId ? { ...post, ...patch } : post)),
    })),
  };
}

export function removeFeedPost(cache: FeedCache | undefined, postId: string): FeedCache | undefined {
  if (!cache) return cache;
  return {
    ...cache,
    pages: cache.pages.map((page) => ({
      ...page,
      data: page.data.filter((post) => post.id !== postId),
    })),
  };
}

// The post's current like count from whichever cached feed holds it — the
// optimistic +1/-1 must start from a real number, not 0, when the post was
// liked from a searched feed the plain feed never loaded.
export function findFeedLikeCount(caches: readonly (FeedCache | undefined)[], postId: string): number {
  for (const cache of caches) {
    for (const page of cache?.pages ?? []) {
      const post = page.data.find((p) => p.id === postId);
      if (post) return post.likeCount;
    }
  }
  return 0;
}
