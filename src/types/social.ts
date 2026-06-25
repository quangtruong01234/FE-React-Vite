// --- Social: posts & comments ---

export interface PostAuthor {
  id: number;
  username: string;
  name?: string;
  avatar: string | null;
}

export interface Post {
  id: number;
  userId: number;
  content: string;
  imageUrls: string[] | null;
  videoUrl: string | null;
  /** Optional attached product. Not hydrated server-side — use `useProductsByIds`. */
  productId: number | null;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  author: PostAuthor;
}

export interface Comment {
  id: number;
  postId: number;
  userId: number;
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
  productId?: number;
}

/** Partial update — owner-only `PATCH /social/posts/:id`. */
export interface UpdatePostDto {
  content?: string;
  imageUrls?: string[] | null;
  videoUrl?: string | null;
  productId?: number | null;
}

export interface ReportPostDto {
  reason: string;
}

export interface CreateCommentDto {
  content: string;
}

export interface CreateReplyDto {
  content: string;
  postId: number;
}

export interface LikeResult {
  likeCount: number;
}

// --- Social: follow ---

export interface FollowResult {
  followed: boolean;
  followingId: number;
}

export interface FollowUser {
  id: number;
  username: string;
  avatar: string | null;
}

export interface FollowerItem {
  followerId: number;
  createdAt: string;
  user: FollowUser;
}

export interface FollowingItem {
  followingId: number;
  createdAt: string;
  user: FollowUser;
}
