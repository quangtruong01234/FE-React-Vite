/**
 * Pure helpers for the order-invoice PDF download. Kept out of the hook/component
 * so the filename + error mapping can be unit-tested without a network or DOM.
 *
 * Backend contract (`GET /api/order/:id/invoice`, 2026-07-15): returns a binary
 * A4 PDF (`Content-Disposition: attachment; filename="invoice-<id>.pdf"`).
 * Access is allowed for the order's buyer, its seller, OR an admin. Status codes:
 *  - 400 non-numeric id · 401 unauthenticated · 403 not buyer/seller/admin ·
 *    404 order not found.
 */

/** Download filename, mirroring the backend `Content-Disposition` value. */
export function invoiceFileName(orderId: string): string {
  return `invoice-${orderId}.pdf`;
}

/** Maps a failed invoice download to a user-facing Vietnamese message. */
export function invoiceErrorMessage(error: unknown): string {
  const status =
    error && typeof error === 'object' && 'statusCode' in error
      ? (error as { statusCode?: number }).statusCode
      : undefined;

  switch (status) {
    case 400:
      return 'Mã đơn hàng không hợp lệ.';
    case 401:
      return 'Vui lòng đăng nhập để tải hóa đơn.';
    case 403:
      return 'Bạn không có quyền tải hóa đơn của đơn hàng này.';
    case 404:
      return 'Không tìm thấy đơn hàng.';
    default:
      return 'Không tải được hóa đơn. Vui lòng thử lại.';
  }
}
