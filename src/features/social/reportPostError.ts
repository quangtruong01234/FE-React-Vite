import { bindTranslator } from '@/lib/i18n/messages';
import type { Lang } from '@/lib/i18n/lang';
import { socialMessages } from './social.i18n';

/**
 * Maps a failed `POST /social/posts/:id/report` error to a user-facing message in
 * the UI language. Backend contract (P1-03): duplicate report → 409, self-report → 400,
 * rate-limit (20/60s) → 429. Kept pure so it can be unit-tested without a network.
 */
export function reportPostErrorMessage(error: unknown, lang: Lang = 'vi'): string {
  const t = bindTranslator(socialMessages, lang);
  const status =
    error && typeof error === 'object' && 'statusCode' in error
      ? (error as { statusCode?: number }).statusCode
      : undefined;

  switch (status) {
    case 409:
      return t('reportDuplicate');
    case 400:
      return t('reportOwnPost');
    case 429:
      return t('reportRateLimited');
    default:
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === 'string' && message.length > 0) return message;
      }
      return t('reportFailed');
  }
}
