import { z } from 'zod';
import type { ApiError } from '@/types';
import type { Lang } from '@/lib/i18n/lang';
import { translate } from '@/lib/i18n/messages';
import { currentPasswordAuthError } from './changePassword';
import { userMessages, userMsg } from './user.i18n';

/**
 * Self-service account deletion (ACCOUNT-DELETE-01): `DELETE /user/me`
 * `{ currentPassword }`, cookie identifies the account, throttled 5 / 60s.
 *
 * - `200 { success, canceledOrderCount }` — gone for good. The response already
 *   cleared the cookie and revoked every other session.
 * - `401` — wrong password (`INVALID_CURRENT_PASSWORD`), the same tagging as
 *   change-password, so the shared mapper puts it on the field.
 * - `403` — an admin account; the action is hidden for admins, so this is only
 *   a stale role.
 * - `400` — blank body (the schema prevents it) or the account is already deleted.
 * - `502` / `503` / `408` — a backend leg failed before anything irreversible:
 *   retrying is safe, though some open orders may already be canceled.
 */
export const deleteAccountSchema = z.object({
  currentPassword: z.string().min(1, userMsg('currentPasswordRequired')),
});

export type DeleteAccountFormData = z.infer<typeof deleteAccountSchema>;

export interface DeleteAccountError {
  field: 'currentPassword' | 'root';
  message: string;
}

export function deleteAccountError(error: unknown, lang: Lang = 'vi'): DeleteAccountError {
  const err = error as ApiError | undefined;
  const status = err?.statusCode ?? err?.status;
  // Before the shared mapper: on this route 403 means "admin", not a wrong password.
  if (status === 403) {
    return { field: 'root', message: translate(userMessages, lang, 'deleteAccountAdmin') };
  }
  const authError = currentPasswordAuthError(error, lang);
  if (authError) return authError;
  if (status === 429) return { field: 'root', message: translate(userMessages, lang, 'tooManyTries') };
  if (status === 400) {
    return { field: 'root', message: translate(userMessages, lang, 'deleteAccountRejected') };
  }
  if (status === 408 || status === 502 || status === 503) {
    return { field: 'root', message: translate(userMessages, lang, 'deleteAccountRetry') };
  }
  // A backend that predates the route.
  if (status === 404) return { field: 'root', message: translate(userMessages, lang, 'notAvailable') };
  return { field: 'root', message: translate(userMessages, lang, 'connectionError') };
}
