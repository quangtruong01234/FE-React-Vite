import { orderStatusLabel } from '@/lib/domain/orderStatus';
import type { Lang } from '@/lib/i18n/lang';
import { translate, type MessageKey } from '@/lib/i18n/messages';
import type { OrderTimelineEvent } from '@/types';
import { orderMessages } from './order.i18n';

type OrderMessageKey = MessageKey<typeof orderMessages>;

/** GHN status codes the buyer is shown in words; anything else falls back to the raw code. */
const GHN_STATUS_KEYS: ReadonlyMap<string, OrderMessageKey> = new Map(Object.entries({
  ready_to_pick: 'ghnReadyToPick',
  picking: 'ghnPicking',
  cancel: 'ghnCancel',
  money_collect_picking: 'ghnMoneyCollectPicking',
  picked: 'ghnPicked',
  storing: 'ghnStoring',
  transporting: 'ghnTransporting',
  sorting: 'ghnSorting',
  delivering: 'ghnDelivering',
  money_collect_delivering: 'ghnMoneyCollectDelivering',
  delivered: 'ghnDelivered',
  delivery_fail: 'ghnDeliveryFail',
  waiting_to_return: 'ghnWaitingToReturn',
  return: 'ghnReturn',
  return_transporting: 'ghnReturnTransporting',
  return_sorting: 'ghnReturnSorting',
  returning: 'ghnReturning',
  return_fail: 'ghnReturnFail',
  returned: 'ghnReturned',
  exception: 'ghnException',
  damage: 'ghnDamage',
  lost: 'ghnLost',
} satisfies Record<string, OrderMessageKey>));

/** Buyer-facing label for a raw GHN status code; unknown codes (e.g. DEV's `teleported`) render as-is. */
export function ghnStatusLabel(code: string, lang: Lang = 'vi'): string {
  const key = GHN_STATUS_KEYS.get(code);
  return key ? translate(orderMessages, lang, key) : code;
}

export interface OrderTimelineRow {
  /** Stable within one response — events are append-only and ordered by the server. */
  key: string;
  label: string;
  /** True for GHN carrier events, so the UI can tag them apart from order-side changes. */
  carrier: boolean;
  at: string;
}

/**
 * ORDER-TIMELINE-01 — turn `GET /api/order/:id/history` events into display
 * rows, keeping the server's oldest-first order. Orders placed before the
 * backend change have no `status` events; that is normal, not an error.
 */
export function orderTimelineRows(
  events: readonly OrderTimelineEvent[],
  lang: Lang = 'vi',
): OrderTimelineRow[] {
  return events.map((event, index) => {
    const key = `${event.kind}-${index}`;
    switch (event.kind) {
      case 'placed':
        return { key, label: translate(orderMessages, lang, 'histPlaced'), carrier: false, at: event.at };
      case 'paid':
        return { key, label: translate(orderMessages, lang, 'histPaid'), carrier: false, at: event.at };
      case 'status':
        return {
          key,
          label: event.status
            ? orderStatusLabel(event.status, lang)
            : translate(orderMessages, lang, 'histStatusUpdated'),
          carrier: false,
          at: event.at,
        };
      case 'shipping':
        return {
          key,
          label: event.ghnStatus
            ? ghnStatusLabel(event.ghnStatus, lang)
            : translate(orderMessages, lang, 'histStatusUpdated'),
          carrier: true,
          at: event.at,
        };
    }
  });
}
