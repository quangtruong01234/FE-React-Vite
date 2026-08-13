import { isGhnAddressRefusal, shippingFeeFailure } from './shippingFeeError';

/**
 * Buyer-facing message for a failed `POST /api/order` (GHN-CREATE-01).
 *
 * Order create used to swallow an undeliverable address and book the order at
 * `shippingFee: 0`; the backend now rethrows GHN's own `400` (the rejection
 * happens before stock is reserved, so nothing is left behind). In the normal
 * flow the buyer never reaches it — the fee preview blocks checkout first — but
 * a race (address edited between preview and submit) or a skipped preview lands
 * the refusal on the submit button, where the raw text is English and names an
 * internal endpoint. Route those through the same wording as the fee banner.
 *
 * Everything else keeps passing the backend message through unchanged; only a
 * missing/blank message falls back to the generic line.
 */
export function checkoutSubmitErrorMessage(error: unknown): string {
  if (isGhnAddressRefusal(error)) return shippingFeeFailure(error).message;

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message.trim();
  }
  return 'Đặt hàng thất bại. Vui lòng thử lại.';
}
