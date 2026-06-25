import type { OrderStatus } from '@/types';

/**
 * Single source of truth for the seller-side order state machine.
 *
 * Backend seller transitions (P1-01):
 *  - `confirm`        : pending    → confirmed
 *  - `ready-to-ship`  : confirmed  → processing  (hands the parcel to GHN)
 *  - `ship`           : processing → shipped
 *  - `deliver`        : shipped    → delivering
 *  - `complete`       : delivering → completed
 *
 * The post-`processing` steps are normally driven by the GHN delivery webhook;
 * the seller endpoints are a race-safe manual override (the backend guards the
 * transition so a seller action and a webhook can't double-run completion).
 * `canceled` / `completed` are terminal — no seller action. Deriving the button
 * from this map keeps the label honest with the transition it triggers.
 */
export type SellerActionKind = 'confirm' | 'ready-to-ship' | 'ship' | 'deliver' | 'complete';

export interface SellerOrderAction {
  kind: SellerActionKind;
  label: string;
}

const SELLER_ACTIONS: Partial<Record<OrderStatus, SellerOrderAction>> = {
  pending:    { kind: 'confirm',       label: 'Xác nhận đơn' },
  confirmed:  { kind: 'ready-to-ship', label: 'Sẵn sàng giao' },
  processing: { kind: 'ship',          label: 'Đã bàn giao vận chuyển' },
  shipped:    { kind: 'deliver',       label: 'Bắt đầu giao hàng' },
  delivering: { kind: 'complete',      label: 'Hoàn tất đơn hàng' },
};

export function getSellerOrderAction(status: OrderStatus): SellerOrderAction | null {
  return SELLER_ACTIONS[status] ?? null;
}
