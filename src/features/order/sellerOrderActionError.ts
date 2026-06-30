import type { SellerActionKind } from './sellerOrderActions';

/**
 * Maps a failed seller order-action (`confirm` / `ready-to-ship`) to a
 * user-facing Vietnamese message. Kept pure so it can be unit-tested without a
 * network.
 *
 * Ready-to-ship contract (backend 2026-06-28): the transition now creates the
 * GHN waybill *before* advancing, so it can legitimately fail and leave the
 * order at `confirmed`:
 *  - 400 → the free-text shipping address could not be resolved to GHN IDs;
 *          the seller must fix the address.
 *  - 500 → GHN unreachable / upstream error; the order stays `confirmed`, retry.
 */
export function sellerOrderActionErrorMessage(error: unknown, kind: SellerActionKind): string {
  const status =
    error && typeof error === 'object' && 'statusCode' in error
      ? (error as { statusCode?: number }).statusCode
      : undefined;

  if (kind === 'ready-to-ship') {
    switch (status) {
      case 400:
        return 'Không thể tạo vận đơn: địa chỉ giao hàng không hợp lệ. Vui lòng kiểm tra lại địa chỉ giao hàng của đơn.';
      case 500:
        return 'Không thể kết nối đơn vị vận chuyển (GHN). Đơn vẫn ở trạng thái đã xác nhận — vui lòng thử lại sau.';
    }
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) return message;
  }

  return kind === 'ready-to-ship'
    ? 'Không thể chuyển đơn sang trạng thái giao hàng. Vui lòng thử lại.'
    : 'Không thể xác nhận đơn. Vui lòng thử lại.';
}
