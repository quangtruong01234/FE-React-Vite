import type { Order, OrderStatus } from '@/types';

/** The order fields the payment-state check needs — a subset of `Order`. */
export type PaymentStateOrder = Pick<Order, 'status' | 'paymentMethod' | 'paidAt'>;

/**
 * Statuses where no payment can be collected any more, whatever `paidAt` says.
 * An order that was canceled or refunded must not offer "Thanh toán ngay".
 */
const UNPAYABLE: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'completed',
  'canceled',
  'refunded',
  'return_requested',
]);

/**
 * Whether the buyer still owes money on this order (ORD-GUARD-01).
 *
 * `paidAt` is the authoritative signal: `null` means no money was collected.
 * COD is never "awaiting payment" — there `paidAt` stays null until delivery,
 * so it tracks handover, not debt.
 *
 * `paidAt` absent entirely means the response predates the field; fall back to
 * the old status heuristic so an older backend keeps behaving as before rather
 * than declaring every online order paid.
 */
export function isAwaitingPayment(order: PaymentStateOrder): boolean {
  if (order.paymentMethod === 'cod') return false;
  if (order.paidAt === undefined) {
    return order.status === 'pending' || order.status === 'confirmed';
  }
  if (order.paidAt !== null) return false;
  return !UNPAYABLE.has(order.status);
}
