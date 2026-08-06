// Share helpers for social posts. Pure URL builder is unit-tested;
// the async actions wrap the Web Share / Clipboard APIs.

export function postShareUrl(postId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/post/${postId}`;
}

export async function copyPostLink(postId: string): Promise<void> {
  await navigator.clipboard.writeText(postShareUrl(postId));
}

/**
 * Opens the native share sheet when available, otherwise copies the link.
 * Returns which path was taken. A cancelled native share rejects (AbortError) —
 * callers should treat a rejection as a no-op, not fall back to copy.
 */
export async function sharePost(postId: string): Promise<'shared' | 'copied'> {
  const url = postShareUrl(postId);
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    await navigator.share({ url });
    return 'shared';
  }
  await navigator.clipboard.writeText(url);
  return 'copied';
}
