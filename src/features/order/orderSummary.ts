import type { OrderItem } from '@/types';

/**
 * One-line product summary for an order row. Order items are server-enriched
 * with `productName`, so no client-side product hydration is needed. Falls back
 * to a count when the name is missing, and to a generic label for an empty order
 * so the row never renders blank.
 */
export function orderItemsSummary(items: OrderItem[]): string {
  const first = items[0];
  const firstName = first?.productName;
  if (firstName) {
    return items.length > 1 ? `${firstName} +${items.length - 1} sản phẩm khác` : firstName;
  }
  return items.length > 0 ? `${items.length} sản phẩm` : 'Đơn hàng';
}

/**
 * Cover image for an order row — the first item's server-enriched `image`
 * (resolved realtime by the order gateway), or empty string when absent.
 */
export function orderCoverImage(items: OrderItem[]): string {
  return items[0]?.image ?? '';
}
