import type { OrderStatus } from '@/types';
import type { Lang } from '@/lib/i18n/lang';
import { translate } from '@/lib/i18n/messages';
import { orderStatusMessages } from './orderStatus.i18n';

/**
 * Single source of truth for order-status semantics shared by buyer + seller
 * views: badge styling, and which filter group a status belongs
 * to. Transition rules stay where they are owned — seller actions in
 * `features/order/sellerOrderActions.ts`, return eligibility in
 * `features/order/returnRequest.ts` — this module only owns per-status facts.
 */
export interface OrderStatusMeta {
  badgeClass: string;
  /** In-flight: counted under the buyer "Đang xử lý" tab. */
  isActive: boolean;
  /** Return/refund flow: counted under the buyer "Trả hàng/Hoàn tiền" tab. */
  isReturn: boolean;
}

export const ORDER_STATUS_META: Record<OrderStatus, OrderStatusMeta> = {
  pending:    { badgeClass: 'bg-tb-amber/10 text-accent-amber border-tb-amber/20',    isActive: true,  isReturn: false },
  confirmed:  { badgeClass: 'bg-tb-cyan/10 text-accent-cyan border-tb-cyan/20',       isActive: true,  isReturn: false },
  processing: { badgeClass: 'bg-accent-violet/10 text-accent-violet border-accent-violet/20', isActive: true,  isReturn: false },
  shipped:    { badgeClass: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20',       isActive: true,  isReturn: false },
  delivering: { badgeClass: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20',       isActive: true,  isReturn: false },
  completed:  { badgeClass: 'bg-tb-green/10 text-accent-green border-tb-green/20',    isActive: false, isReturn: false },
  canceled:   { badgeClass: 'bg-tb-red/10 text-accent-red border-tb-red/20',          isActive: false, isReturn: false },
  return_requested: { badgeClass: 'bg-tb-amber/10 text-accent-amber border-tb-amber/20', isActive: false, isReturn: true },
  refunded:   { badgeClass: 'bg-accent-violet/10 text-accent-violet border-accent-violet/20', isActive: false, isReturn: true },
};

/** Display label for a status — the copy lives in `orderStatus.i18n.ts`, keyed by the status. */
export function orderStatusLabel(status: OrderStatus, lang: Lang = 'vi'): string {
  return translate(orderStatusMessages, lang, status);
}

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
