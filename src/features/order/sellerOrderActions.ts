import type { OrderStatus, PaymentMethod } from '@/types';

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

/** The order fields the seller-action gate needs — a subset of `Order`. */
export interface SellerActionOrder {
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paidAt?: string | null;
}

export interface SellerOrderActionState {
  /** The action for this status, or null when the status exposes none. */
  action: SellerOrderAction | null;
  /**
   * Non-null when the action exists but the backend would reject it — render
   * this reason instead of an enabled button.
   */
  blockedReason: string | null;
}

/**
 * Seller action + whether it can actually run (ORD-GUARD-01).
 *
 * The backend refuses to confirm or hand off an online order whose payment
 * never settled (`paidAt === null`), and answers 400. That 400 is the backstop;
 * the seller should see *why* the button is unavailable instead of clicking it.
 *
 * COD is exempt: there `paidAt` stays null until delivery, so it means "chưa
 * giao", not "chưa trả tiền". `paidAt` being absent entirely (an older backend
 * that predates the field) must not block either — hence the `=== null` check
 * rather than a nullish one.
 */
export function getSellerOrderActionState(order: SellerActionOrder): SellerOrderActionState {
  const action = getSellerOrderAction(order.status);
  if (!action) return { action: null, blockedReason: null };

  const unsettledOnline = order.paymentMethod !== 'cod' && order.paidAt === null;
  return {
    action,
    blockedReason: unsettledOnline ? 'Khách chưa thanh toán — chưa thể xử lý đơn' : null,
  };
}
