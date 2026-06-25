import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queryKeys';
import { api } from '@/api';
import type { FollowingItem, PaginatedResponse } from '@/types';

export function useFollowers(userId: number) {
  return useQuery({
    queryKey: queryKeys.social.followers(userId),
    queryFn: () => api.social.getFollowers(userId),
    enabled: userId > 0,
  });
}

export function useFollowing(userId: number) {
  return useQuery({
    queryKey: queryKeys.social.following(userId),
    queryFn: () => api.social.getFollowing(userId),
    enabled: userId > 0,
  });
}

export function useFollowingFeed(userId: number, active = false) {
  return useInfiniteQuery({
    queryKey: queryKeys.social.followingFeed(userId),
    queryFn: ({ pageParam }) => api.social.getFollowingFeed(userId, pageParam as number, 10),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasNext ? (lastPageParam as number) + 1 : undefined,
    enabled: userId > 0 && active,
  });
}

export function useFollowUser(targetId: number, viewerId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.social.followUser(targetId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.following(viewerId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.followers(targetId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.followingFeed(viewerId) });
    },
  });
}

export function useUnfollowUser(targetId: number, viewerId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.social.unfollowUser(targetId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.following(viewerId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.followers(targetId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.followingFeed(viewerId) });
    },
  });
}

// Derive isFollowing from the cached following list
export function useIsFollowing(viewerId: number, targetId: number): { isFollowing: boolean; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.social.following(viewerId),
    queryFn: () => api.social.getFollowing(viewerId),
    enabled: viewerId > 0 && targetId > 0,
  });
  const isFollowing = (data as PaginatedResponse<FollowingItem> | undefined)?.data.some(
    (f) => f.user.id === targetId,
  ) ?? false;
  return { isFollowing, isLoading: viewerId > 0 && isLoading };
}
