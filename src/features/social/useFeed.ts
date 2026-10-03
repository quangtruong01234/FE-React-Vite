import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/query/queryKeys';
import { api } from '@/api';
import type { LikeResult, Post, UpdatePostDto } from '@/types';
import { findFeedLikeCount, patchFeedPost, removeFeedPost } from './feedCache';
import type { FeedCache } from './feedCache';

type FeedSnapshot = Array<[QueryKey, FeedCache | undefined]>;

// `search` is the server-side content filter (SEARCH-01); `""` is the plain feed.
export function useFeed(search = '') {
  return useInfiniteQuery({
    queryKey: queryKeys.social.feed(search),
    queryFn: ({ pageParam }) =>
      api.social.getFeed(pageParam as number, 10, search),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasNext ? (lastPageParam as number) + 1 : undefined,
  });
}

// Every for-you feed cache (plain + each searched term) holds its own copy of a
// post, so writes patch all of them via the `feedAll` prefix.
function patchAllFeeds(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
  patch: Partial<Post>,
): void {
  queryClient.setQueriesData<FeedCache>(
    { queryKey: queryKeys.social.feedAll },
    (old) => patchFeedPost(old, postId, patch),
  );
}

async function snapshotFeeds(
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<FeedSnapshot> {
  await queryClient.cancelQueries({ queryKey: queryKeys.social.feedAll });
  return queryClient.getQueriesData<FeedCache>({ queryKey: queryKeys.social.feedAll });
}

function restoreFeeds(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshot: FeedSnapshot | undefined,
): void {
  for (const [key, data] of snapshot ?? []) queryClient.setQueryData(key, data);
}

export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => api.social.likePost(postId),
    onMutate: async (postId: string) => {
      const snapshot = await snapshotFeeds(queryClient);
      const current = findFeedLikeCount(snapshot.map(([, data]) => data), postId);
      patchAllFeeds(queryClient, postId, { isLiked: true, likeCount: current + 1 });
      return { snapshot };
    },
    onSuccess: (result: LikeResult, postId: string) => {
      patchAllFeeds(queryClient, postId, { isLiked: true, likeCount: result.likeCount });
    },
    onError: (_err, _postId, context) => {
      restoreFeeds(queryClient, context?.snapshot);
    },
  });
}

export function useUnlikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => api.social.unlikePost(postId),
    onMutate: async (postId: string) => {
      const snapshot = await snapshotFeeds(queryClient);
      const current = findFeedLikeCount(snapshot.map(([, data]) => data), postId);
      patchAllFeeds(queryClient, postId, { isLiked: false, likeCount: Math.max(0, current - 1) });
      return { snapshot };
    },
    onSuccess: (result: LikeResult, postId: string) => {
      patchAllFeeds(queryClient, postId, { isLiked: false, likeCount: result.likeCount });
    },
    onError: (_err, _postId, context) => {
      restoreFeeds(queryClient, context?.snapshot);
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePostDto }) =>
      api.social.updatePost(id, data),
    onSuccess: (updated: Post) => {
      // Patch the post in-place across the for-you feed caches…
      patchAllFeeds(queryClient, updated.id, updated);
      // …and refresh the surfaces that hold their own copy.
      queryClient.setQueryData<Post>(queryKeys.social.post(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.followingFeedAll });
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.userScopeAll });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => api.social.deletePost(postId),
    onSuccess: (_result, postId: string) => {
      // Drop the post from every for-you feed cache immediately…
      queryClient.setQueriesData<FeedCache>(
        { queryKey: queryKeys.social.feedAll },
        (old) => removeFeedPost(old, postId),
      );
      // …then refetch the other surfaces that could hold it.
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.followingFeedAll });
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.userScopeAll });
      queryClient.removeQueries({ queryKey: queryKeys.social.post(postId) });
    },
  });
}
