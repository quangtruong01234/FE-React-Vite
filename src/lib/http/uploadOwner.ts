/**
 * Resolves the Cloudinary owner id for an upload. Signed uploads tag every asset
 * with a `<ownerId>_<publicId>` prefix, so an unauthenticated uploader must be
 * blocked outright — falling back to `0` would stamp media with the wrong owner
 * (`0_...`), which the backend ownership check (SEC-M) then rejects, and which
 * cannot be cleaned up by the real user. Returns the id, or an error message the
 * caller surfaces instead of starting the upload (UP-06).
 */
export const UPLOAD_LOGIN_REQUIRED = 'Bạn cần đăng nhập để tải tệp lên.';

export type UploadOwner = { ownerId: string } | { error: string };

export function resolveUploadOwner(currentUser: { id: string } | null | undefined): UploadOwner {
  if (currentUser?.id == null) return { error: UPLOAD_LOGIN_REQUIRED };
  return { ownerId: currentUser.id };
}
