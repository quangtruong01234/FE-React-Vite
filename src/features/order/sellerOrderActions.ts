import type { OrderStatus } from '@/types';

/**
 * Single source of truth for the seller-side order state machine.
 *
 * Seller responsibility ends at carrier hand-off (Shopee-style):
 *  - `confirm`        : pending    → confirmed
 *  - `ready-to-ship`  : confirmed  → processing  (hands the parcel to GHN)
 *
 * Everything after `processing` (shipped → delivering → completed) is owned by
 * GHN: the delivery webhook advances the status and is the only source of the
 * `ghnOrderCode`. The seller does NOT manually click through those — a manual
 * advance would jump the status without GHN, leaving no waybill and an
 * out-of-sync carrier. `completed` is reached when the buyer confirms receipt
 * (or auto-complete), `canceled`/`completed` are terminal. So statuses beyond
 * `confirmed` expose no seller action.
 */
export type SellerActionKind = 'confirm' | 'ready-to-ship';

export interface SellerOrderAction {
  kind: SellerActionKind;
  label: string;
}

const SELLER_ACTIONS: Partial<Record<OrderStatus, SellerOrderAction>> = {
  pending:   { kind: 'confirm',       label: 'Xác nhận đơn' },
  confirmed: { kind: 'ready-to-ship', label: 'Sẵn sàng giao' },
};

export function getSellerOrderAction(status: OrderStatus): SellerOrderAction | null {
  return SELLER_ACTIONS[status] ?? null;
}
