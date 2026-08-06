/**
 * Public order ids are `ord_` + 16 alphanumerics — the same shape the order
 * service validates against (`libs/common/src/public-id/public-id.util`), and
 * the only shape `/order/:id` accepts. Anything else 400s with
 * "Invalid id — expected format ord_<16 alphanumeric characters>".
 */
const ORDER_PUBLIC_ID = /^ord_[0-9A-Za-z]{16}$/;

/**
 * Resolve the `order` query param of a gateway return URL into an id the app
 * can actually route to, or `''` when there is none.
 *
 * Verified against a live backend 2026-08-04: `order=` carries the **internal
 * numeric** order id, not the public one — `buildFrontendPaymentResultUrl()` in
 * `apps/payments/src/payments.service.ts` is handed the same `orderId` it later
 * feeds to `Number(orderId)`. Since the PUBID migration that number routes
 * nowhere: `/order/111` 400s at the API and the page renders "Không tìm thấy
 * đơn hàng.". So a numeric param is deliberately treated as *absent* — the
 * caller falls back to the order list instead of shipping a dead deep link.
 *
 * The guard is written against the public-id shape rather than as a "reject
 * digits" rule so the deep link starts working on its own the day the backend
 * sends `ord_…` (see `backend-handoff.md`), with no change here.
 */
export function resolveResultOrderId(orderParam: string | null | undefined): string {
  const value = orderParam ?? '';
  return ORDER_PUBLIC_ID.test(value) ? value : '';
}
