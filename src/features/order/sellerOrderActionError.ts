import type { SellerActionKind } from './sellerOrderActions';
import type { Lang } from '@/lib/i18n/lang';
import { bindTranslator } from '@/lib/i18n/messages';
import { orderMessages } from './order.i18n';

/**
 * Maps a failed seller order-action (`confirm` / `ready-to-ship`) to a
 * user-facing message. Kept pure so it can be unit-tested without a
 * network.
 *
 * Ready-to-ship contract (backend 2026-06-28): the transition now creates the
 * GHN waybill *before* advancing, so it can legitimately fail and leave the
 * order at `confirmed`:
 *  - 400 → the free-text shipping address could not be resolved to GHN IDs;
 *          the seller must fix the address.
 *  - 500 → GHN unreachable / upstream error; the order stays `confirmed`, retry.
 */
export function sellerOrderActionErrorMessage(
  error: unknown,
  kind: SellerActionKind,
  lang: Lang = 'vi',
): string {
  const t = bindTranslator(orderMessages, lang);
  const status =
    error && typeof error === 'object' && 'statusCode' in error
      ? (error as { statusCode?: number }).statusCode
      : undefined;

  if (kind === 'ready-to-ship') {
    switch (status) {
      case 400:
        return t('shipBadAddress');
      case 500:
        return t('shipGhnDown');
    }
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) return message;
  }

  return kind === 'ready-to-ship' ? t('shipFailed') : t('confirmFailed');
}
