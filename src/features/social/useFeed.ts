import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/query/queryKeys';
import { api } from '@/api';
import type { LikeResult, PaginatedResponse, Post, UpdatePostDto } from '@/types';

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

export function useUpdatePost() {
  const queryClient = useQueryClient();
  const feedKey = queryKeys.social.feed(1);

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePostDto }) =>
      api.social.updatePost(id, data),
    onSuccess: (updated: Post) => {
      // Patch the post in-place across the for-you feed cache…
      updateFeedLike(queryClient, feedKey, updated.id, updated);
      // …and refresh the surfaces that hold their own copy.
      queryClient.setQueryData<Post>(queryKeys.social.post(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: ['social', 'following-feed'] });
      void queryClient.invalidateQueries({ queryKey: ['social', 'user'] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  const feedKey = queryKeys.social.feed(1);

  return useMutation({
    mutationFn: (postId: number) => api.social.deletePost(postId),
    onSuccess: (_result, postId: number) => {
      // Drop the post from the for-you feed cache immediately…
      queryClient.setQueryData<FeedCache>(feedKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.filter((post) => post.id !== postId),
          })),
        };
      });
      // …then refetch the other surfaces that could hold it.
      void queryClient.invalidateQueries({ queryKey: ['social', 'following-feed'] });
      void queryClient.invalidateQueries({ queryKey: ['social', 'user'] });
      queryClient.removeQueries({ queryKey: queryKeys.social.post(postId) });
    },
  });
}
