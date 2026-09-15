import { userDisplayName, nonBlank } from '@/lib/format/user';
import type { PostAuthor } from '@/types';

export interface CommentAuthorView {
  displayName: string;
  /** `undefined` (not `null`) so it can be spread straight onto `<Avatar src>`. */
  avatarSrc: string | undefined;
}

/**
 * Display identity for a comment or reply.
 *
 * `author` is embedded by the backend since SOCIAL-AUTHOR-01, but it is
 * nullable by design (deleted user, or the user service being unreachable while
 * the comment read still succeeds). The old `Người dùng #usr_xxx` fallback
 * leaked an opaque id into the UI, so the neutral case carries no id at all.
 */
export function commentAuthorView(author: PostAuthor | null | undefined): CommentAuthorView {
  return {
    displayName: userDisplayName(author),
    avatarSrc: nonBlank(author?.avatar) ?? undefined,
  };
}
