export interface PendingAvatar {
  url: string;
  publicId: string;
}

/**
 * Decide the new pending avatar and which previous upload (if any) is now an
 * orphan to delete from Cloudinary.
 *
 * The avatar is uploaded the instant a file is chosen, before the profile is
 * saved (UP-02). Choosing a *different* file before saving strands the earlier
 * upload — it was never persisted, so nothing else will ever clean it up. This
 * returns the prior upload's `publicId` as the orphan so the caller can
 * `deleteMedia` it.
 */
export function replacePendingAvatar(
  prev: PendingAvatar | null,
  incoming: PendingAvatar,
): { next: PendingAvatar; orphan: string | null } {
  return { next: incoming, orphan: prev ? prev.publicId : null };
}

/**
 * The orphan to delete when a not-yet-saved avatar is discarded (cancel / close
 * the modal). A freshly-uploaded-but-unsaved avatar must be removed from
 * Cloudinary; `null` (nothing uploaded this session) means nothing to delete.
 *
 * Note: after a *successful* save the pending upload is persisted — the caller
 * must clear its tracking WITHOUT calling this, or it would delete the avatar it
 * just saved.
 */
export function discardedAvatarOrphan(pending: PendingAvatar | null): string | null {
  return pending ? pending.publicId : null;
}
