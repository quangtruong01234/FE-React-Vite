import type { Lang } from '@/lib/i18n/lang';
import { translate } from '@/lib/i18n/messages';
import { uploadMessages } from './upload.i18n';

/**
 * Resolves the Cloudinary owner id for an upload. Signed uploads tag every asset
 * with a `<ownerId>_<publicId>` prefix, so an unauthenticated uploader must be
 * blocked outright — falling back to `0` would stamp media with the wrong owner
 * (`0_...`), which the backend ownership check (SEC-M) then rejects, and which
 * cannot be cleaned up by the real user. Returns the id, or an error message the
 * caller surfaces instead of starting the upload (UP-06).
 */
export function uploadLoginRequired(lang: Lang = 'vi'): string {
  return translate(uploadMessages, lang, 'loginRequired');
}

export const UPLOAD_LOGIN_REQUIRED = uploadLoginRequired('vi');

export type UploadOwner = { ownerId: string } | { error: string };

export function resolveUploadOwner(
  currentUser: { id: string } | null | undefined,
  lang: Lang = 'vi',
): UploadOwner {
  if (currentUser?.id == null) return { error: uploadLoginRequired(lang) };
  return { ownerId: currentUser.id };
}
