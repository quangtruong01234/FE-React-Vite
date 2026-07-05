import type {
  Post,
  Comment,
  CommentTree,
  CreatePostDto,
  UpdatePostDto,
  ReportPostDto,
  ReportedPostGroup,
  PostReportStatus,
  ModeratePostResult,
  DismissReportsResult,
  CreateCommentDto,
  CreateReplyDto,
  LikeResult,
  FollowResult,
  FollowerItem,
  FollowingItem,
  PaginatedResponse,
} from '@/types';
import { request, toQuery } from './client';

export const socialApi = {
  createPost: (data: CreatePostDto): Promise<Post> =>
    request<Post>('/social/posts', { method: 'POST', body: JSON.stringify(data) }),

  updatePost: (id: number, data: UpdatePostDto): Promise<Post> =>
    request<Post>(`/social/posts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  reportPost: (id: number, data: ReportPostDto): Promise<unknown> =>
    request(`/social/posts/${id}/report`, { method: 'POST', body: JSON.stringify(data) }),

  getFeed: (page = 1, limit = 20): Promise<PaginatedResponse<Post>> => {
    const qs = toQuery({ page, limit });
    return request<PaginatedResponse<Post>>(`/social/posts${qs}`);
  },

  getPostsByUser: (userId: number, page = 1, limit = 20): Promise<PaginatedResponse<Post>> => {
    const qs = toQuery({ page, limit });
    return request<PaginatedResponse<Post>>(`/social/posts/user/${userId}${qs}`);
  },

  getPostById: (id: number): Promise<Post> =>
    request<Post>(`/social/posts/${id}`),

  likePost: (id: number): Promise<LikeResult> =>
    request<LikeResult>(`/social/posts/${id}/like`, { method: 'POST' }),

  unlikePost: (id: number): Promise<LikeResult> =>
    request<LikeResult>(`/social/posts/${id}/like`, { method: 'DELETE' }),

  deletePost: (id: number): Promise<unknown> =>
    request(`/social/posts/${id}`, { method: 'DELETE' }),

  createComment: (postId: number, data: CreateCommentDto): Promise<Comment> =>
    request<Comment>(`/social/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(data) }),

  getComments: (postId: number, page = 1, limit = 20): Promise<PaginatedResponse<Comment>> => {
    const qs = toQuery({ page, limit });
    return request<PaginatedResponse<Comment>>(`/social/posts/${postId}/comments${qs}`);
  },

  deleteComment: (id: number): Promise<unknown> =>
    request(`/social/comments/${id}`, { method: 'DELETE' }),

  createReply: (commentId: number, data: CreateReplyDto): Promise<Comment> =>
    request<Comment>(`/social/comments/${commentId}/replies`, { method: 'POST', body: JSON.stringify(data) }),

  getReplies: (commentId: number, depth?: number): Promise<CommentTree> => {
    const qs = depth !== undefined ? toQuery({ depth }) : '';
    return request<CommentTree>(`/social/comments/${commentId}/replies${qs}`);
  },

  followUser: (id: number): Promise<FollowResult> =>
    request<FollowResult>(`/social/users/${id}/follow`, { method: 'POST' }),

  unfollowUser: (id: number): Promise<FollowResult> =>
    request<FollowResult>(`/social/users/${id}/follow`, { method: 'DELETE' }),

  getFollowers: (id: number, page = 1, limit = 20): Promise<PaginatedResponse<FollowerItem>> => {
    const qs = toQuery({ page, limit });
    return request<PaginatedResponse<FollowerItem>>(`/social/users/${id}/followers${qs}`);
  },

  getFollowing: (id: number, page = 1, limit = 20): Promise<PaginatedResponse<FollowingItem>> => {
    const qs = toQuery({ page, limit });
    return request<PaginatedResponse<FollowingItem>>(`/social/users/${id}/following${qs}`);
  },

  getFollowingFeed: (id: number, page = 1, limit = 20): Promise<PaginatedResponse<Post>> => {
    const qs = toQuery({ page, limit });
    return request<PaginatedResponse<Post>>(`/social/users/${id}/feed${qs}`);
  },

  // --- Admin moderation (F5) — admin role required, non-admin → 403 ---

  getReportedPosts: (
    status: PostReportStatus = 'pending',
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<ReportedPostGroup>> => {
    const qs = toQuery({ status, page, limit });
    return request<PaginatedResponse<ReportedPostGroup>>(`/social/admin/reports${qs}`);
  },

  hidePost: (id: number): Promise<ModeratePostResult> =>
    request<ModeratePostResult>(`/social/admin/posts/${id}/hide`, { method: 'POST' }),

  unhidePost: (id: number): Promise<ModeratePostResult> =>
    request<ModeratePostResult>(`/social/admin/posts/${id}/unhide`, { method: 'POST' }),

  dismissReports: (id: number): Promise<DismissReportsResult> =>
    request<DismissReportsResult>(`/social/admin/posts/${id}/dismiss`, { method: 'POST' }),

  adminDeletePost: (id: number): Promise<{ success: boolean }> =>
    request<{ success: boolean }>(`/social/admin/posts/${id}`, { method: 'DELETE' }),
};
