import type { OrderStatus } from '@/types';

/**
 * Single source of truth for order-status semantics shared by buyer + seller
 * views: display label, badge styling, and which filter group a status belongs
 * to. Transition rules stay where they are owned — seller actions in
 * `features/order/sellerOrderActions.ts`, return eligibility in
 * `features/order/returnRequest.ts` — this module only owns per-status facts.
 */
export interface OrderStatusMeta {
  label: string;
  badgeClass: string;
  /** In-flight: counted under the buyer "Đang xử lý" tab. */
  isActive: boolean;
  /** Return/refund flow: counted under the buyer "Trả hàng/Hoàn tiền" tab. */
  isReturn: boolean;
}

export const ORDER_STATUS_META: Record<OrderStatus, OrderStatusMeta> = {
  pending:    { label: 'Chờ xác nhận',     badgeClass: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20',    isActive: true,  isReturn: false },
  confirmed:  { label: 'Đã xác nhận',      badgeClass: 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20',       isActive: true,  isReturn: false },
  processing: { label: 'Đang xử lý',       badgeClass: 'bg-accent-violet/10 text-accent-violet border-accent-violet/20', isActive: true,  isReturn: false },
  shipped:    { label: 'Đang vận chuyển',  badgeClass: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20',       isActive: true,  isReturn: false },
  delivering: { label: 'Đang giao',        badgeClass: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20',       isActive: true,  isReturn: false },
  completed:  { label: 'Hoàn thành',       badgeClass: 'bg-accent-green/10 text-accent-green border-accent-green/20',    isActive: false, isReturn: false },
  canceled:   { label: 'Đã hủy',           badgeClass: 'bg-accent-red/10 text-accent-red border-accent-red/20',          isActive: false, isReturn: false },
  return_requested: { label: 'Yêu cầu trả hàng', badgeClass: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20', isActive: false, isReturn: true },
  refunded:   { label: 'Đã hoàn tiền',     badgeClass: 'bg-accent-violet/10 text-accent-violet border-accent-violet/20', isActive: false, isReturn: true },
};

export const ORDER_STATUSES = Object.keys(ORDER_STATUS_META) as OrderStatus[];

export const ACTIVE_STATUSES: readonly OrderStatus[] = ORDER_STATUSES.filter(
  (s) => ORDER_STATUS_META[s].isActive,
);

export const RETURN_STATUSES: readonly OrderStatus[] = ORDER_STATUSES.filter(
  (s) => ORDER_STATUS_META[s].isReturn,
);

export function isActiveStatus(status: OrderStatus): boolean {
  return ORDER_STATUS_META[status].isActive;
}

export function isReturnStatus(status: OrderStatus): boolean {
  return ORDER_STATUS_META[status].isReturn;
}
