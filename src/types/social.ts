// --- Social: posts & comments ---

export interface PostAuthor {
  id: string;
  username: string;
  name?: string;
  avatar: string | null;
}

export interface Post {
  id: string;
  userId: string;
  content: string;
  imageUrls: string[] | null;
  videoUrl: string | null;
  /** Optional attached product. Not hydrated server-side — use `useProductsByIds`. */
  productId: string | null;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  author: PostAuthor;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  parentCommentId?: string | null;
  content: string;
  replyCount?: number;
  createdAt: string;
}

export interface CommentTree extends Comment {
  children: CommentTree[];
}

export interface CreatePostDto {
  content: string;
  imageUrls?: string[];
  videoUrl?: string;
  productId?: string;
}

/** Partial update — owner-only `PATCH /social/posts/:id`. */
export interface UpdatePostDto {
  content?: string;
  imageUrls?: string[] | null;
  videoUrl?: string | null;
  productId?: string | null;
}

export interface ReportPostDto {
  reason: string;
}

// --- Social: admin moderation (F5) ---

export type PostReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface PostReport {
  id: number;
  reporterId: string;
  reason: string;
  status: PostReportStatus;
  createdAt: string;
}

/** Post as returned in the admin reports queue — carries moderation flags. */
export interface ReportedPost extends Post {
  isHidden: boolean;
  hiddenAt: string | null;
}

/** One row of `GET /social/admin/reports` — reports grouped per post. */
export interface ReportedPostGroup {
  post: ReportedPost;
  reportCount: number;
  pendingCount: number;
  latestReportedAt: string;
  reports: PostReport[];
}

export interface ModeratePostResult {
  postId: string;
  isHidden: boolean;
}

export interface DismissReportsResult {
  postId: string;
  /** Number of pending reports flipped to dismissed. */
  dismissed: number;
}

export interface CreateCommentDto {
  content: string;
}

export interface CreateReplyDto {
  content: string;
  postId: string;
}

export interface LikeResult {
  likeCount: number;
}

// --- Social: follow ---

export interface FollowResult {
  followed: boolean;
  followingId: string;
}

export interface FollowUser {
  id: string;
  username: string;
  avatar: string | null;
}

export interface FollowerItem {
  followerId: string;
  createdAt: string;
  user: FollowUser;
}

export interface FollowingItem {
  followingId: string;
  createdAt: string;
  user: FollowUser;
}
