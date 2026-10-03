import type { ApiError } from '@/types';
import type { Lang } from '@/lib/i18n/lang';
import { translate } from '@/lib/i18n/messages';
import { userMessages } from './user.i18n';

/**
 * "Log out of all devices" (SESSION-REVOKE-01): `POST /user/logout-all`, cookie
 * only. `201` revokes every session of the account — this one included — and
 * clears the cookie. A `401` never reaches this mapping: the global redirect in
 * `request()` already sends a dead session to `/login`.
 */
export function logoutAllErrorMessage(error: unknown, lang: Lang = 'vi'): string {
  const err = error as ApiError | undefined;
  const status = err?.statusCode ?? err?.status;
  // Session store down: nothing was revoked and the cookie was kept.
  if (status === 503) return translate(userMessages, lang, 'sessionStoreBusy');
  if (status === 429) return translate(userMessages, lang, 'tooManyTries');
  // A backend that predates the route.
  if (status === 404) return translate(userMessages, lang, 'notAvailable');
  return translate(userMessages, lang, 'connectionError');
}
