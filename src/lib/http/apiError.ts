import type { ApiError } from '@/types';

/**
 * Normalise anything TanStack Query hands back in `error` into the shape
 * `<ApiErrorState>` understands, or `null` when there was no error.
 *
 * A rejected `fetch` (network down) carries no `statusCode`, so it is normalised
 * to `0` — the offline panel — and its raw `Failed to fetch` message is dropped
 * rather than shown to the user as "Thông báo từ máy chủ".
 *
 * Extracted from `features/order/orderDetailError.ts` once a second, third and
 * sixth page needed the same normalisation: a page that reads only `data` and
 * `isLoading` renders its *empty* state on a failed request, telling the user
 * their cart / queue / dashboard is empty when the server merely refused to
 * answer. `orderLoadError` still wraps this with its own 404 rule.
 */
export function toApiError(error: unknown): ApiError | null {
  if (!error) return null;

  const raw = typeof error === 'object' ? (error as { statusCode?: unknown; message?: unknown }) : {};
  const statusCode = typeof raw.statusCode === 'number' ? raw.statusCode : 0;
  const message = statusCode !== 0 && typeof raw.message === 'string' ? raw.message : '';
  return { statusCode, status: statusCode, message };
}
