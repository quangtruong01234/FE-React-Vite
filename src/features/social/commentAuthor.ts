import type { PostAuthor } from '@/types';

/** Shown when a comment has no resolvable author — never paired with an id. */
export const COMMENT_AUTHOR_FALLBACK = 'Người dùng';

export interface CommentAuthorView {
  displayName: string;
  /** `undefined` (not `null`) so it can be spread straight onto `<Avatar src>`. */
  avatarSrc: string | undefined;
}

function nonBlank(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
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
    displayName:
      nonBlank(author?.name) ?? nonBlank(author?.username) ?? COMMENT_AUTHOR_FALLBACK,
    avatarSrc: nonBlank(author?.avatar) ?? undefined,
  };
}
