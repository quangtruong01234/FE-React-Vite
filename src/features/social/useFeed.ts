import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queryKeys';
import { api } from '@/api';
import type { PaginatedResponse, Post } from '@/types';

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

export function useLikePost() {
  const queryClient = useQueryClient();
  const feedKey = queryKeys.social.feed(1);

  return useMutation({
    mutationFn: (postId: number) => api.social.likePost(postId),
    onMutate: async (postId: number) => {
      await queryClient.cancelQueries({ queryKey: feedKey });
      const snapshot = queryClient.getQueryData<FeedCache>(feedKey);

      queryClient.setQueryData<FeedCache>(feedKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.map((post) =>
              post.id === postId
                ? { ...post, likeCount: post.likeCount + 1 }
                : post,
            ),
          })),
        };
      });

      return { snapshot };
    },
    onError: (_err, _postId, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData<FeedCache>(feedKey, context.snapshot);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: feedKey });
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

      queryClient.setQueryData<FeedCache>(feedKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.map((post) =>
              post.id === postId
                ? { ...post, likeCount: Math.max(0, post.likeCount - 1) }
                : post,
            ),
          })),
        };
      });

      return { snapshot };
    },
    onError: (_err, _postId, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData<FeedCache>(feedKey, context.snapshot);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: feedKey });
    },
  });
}
