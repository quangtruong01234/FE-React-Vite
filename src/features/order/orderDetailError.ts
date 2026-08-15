import { toApiError } from '@/lib/http/apiError';
import type { ApiError } from '@/types';

/**
 * Decides what an order-detail load failure actually was.
 *
 * BUG-404-01 (backend 2026-08-02): `GET /api/order/:id` used to answer
 * `500 "Internal server error"` for a well-formed but unknown `ord_` id — it now
 * answers a real `404`. FE used to render one blanket "Không tìm thấy đơn hàng."
 * for *every* failure, which told a buyer whose order exists but whose session
 * expired (401), who opened someone else's order (403), or who is simply offline,
 * that their order was gone.
 *
 * Returns `null` when the page should render its own not-found state (404, or a
 * successful response with no order), otherwise the normalised `ApiError` from
 * `toApiError` for `<ApiErrorState>`.
 */
export function orderLoadError(error: unknown): ApiError | null {
  const normalised = toApiError(error);
  if (!normalised || normalised.statusCode === 404) return null;
  return normalised;
}
