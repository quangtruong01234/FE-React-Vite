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

export interface OrderPriceBreakdown {
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
}

/**
 * Build the price breakdown shown on the order-detail summary. The backend now
 * returns explicit `subtotal` and a non-null `shippingFee` (both numbers), so
 * those are used directly when present. For legacy/multi-seller responses that
 * predate those fields, `subtotal` falls back to Σ item price×qty and the
 * shipping fee is recovered as `total - subtotal + discount` (clamped at 0).
 * Money fields may arrive as decimal strings, hence the `Number()` coercions.
 */
export function orderPriceBreakdown(order: {
  items: Pick<OrderItem, 'price' | 'quantity'>[];
  total: number | string;
  discountAmount?: number | string | null;
  subtotal?: number | string | null;
  shippingFee?: number | string | null;
}): OrderPriceBreakdown {
  const subtotal =
    order.subtotal != null
      ? Number(order.subtotal)
      : order.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const total = Number(order.total);
  const discount = Number(order.discountAmount ?? 0);
  const shippingFee =
    order.shippingFee != null
      ? Number(order.shippingFee)
      : Math.max(0, total - subtotal + discount);
  return { subtotal, shippingFee, discount, total };
}
