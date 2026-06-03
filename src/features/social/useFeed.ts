import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queryKeys';
import { api } from '@/api';
import type { LikeResult, PaginatedResponse, Post } from '@/types';

type FeedCache = InfiniteData<PaginatedResponse<Post>>;

export function useFeed() {
  return useInfiniteQuery({
    queryKey: queryKeys.social.feed(1),
    queryFn: ({ pageParam }) =>
      api.social.getFeed(pageParam as number, 10),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasNext ? (lastPageParam as number) + 1 : undefined,
  });
}

function updateFeedLike(
  queryClient: ReturnType<typeof useQueryClient>,
  feedKey: ReturnType<typeof queryKeys.social.feed>,
  postId: number,
  patch: Partial<Post>,
): void {
  queryClient.setQueryData<FeedCache>(feedKey, (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        data: page.data.map((post) =>
          post.id === postId ? { ...post, ...patch } : post,
        ),
      })),
    };
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();
  const feedKey = queryKeys.social.feed(1);

  return useMutation({
    mutationFn: (postId: number) => api.social.likePost(postId),
    onMutate: async (postId: number) => {
      await queryClient.cancelQueries({ queryKey: feedKey });
      const snapshot = queryClient.getQueryData<FeedCache>(feedKey);
      updateFeedLike(queryClient, feedKey, postId, { isLiked: true, likeCount: (snapshot?.pages.flatMap((p) => p.data).find((p) => p.id === postId)?.likeCount ?? 0) + 1 });
      return { snapshot };
    },
    onSuccess: (result: LikeResult, postId: number) => {
      updateFeedLike(queryClient, feedKey, postId, { isLiked: true, likeCount: result.likeCount });
    },
    onError: (_err, _postId, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData<FeedCache>(feedKey, context.snapshot);
      }
    },
  });
}

export function useUnlikePost() {
  const queryClient = useQueryClient();
  const feedKey = queryKeys.social.feed(1);

  return useMutation({
    mutationFn: (postId: number) => api.social.unlikePost(postId),
    onMutate: async (postId: number) => {
      await queryClient.cancelQueries({ queryKey: feedKey });
      const snapshot = queryClient.getQueryData<FeedCache>(feedKey);
      const current = snapshot?.pages.flatMap((p) => p.data).find((p) => p.id === postId)?.likeCount ?? 0;
      updateFeedLike(queryClient, feedKey, postId, { isLiked: false, likeCount: Math.max(0, current - 1) });
      return { snapshot };
    },
    onSuccess: (result: LikeResult, postId: number) => {
      updateFeedLike(queryClient, feedKey, postId, { isLiked: false, likeCount: result.likeCount });
    },
    onError: (_err, _postId, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData<FeedCache>(feedKey, context.snapshot);
      }
    },
  });
}
