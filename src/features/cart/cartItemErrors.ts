import type { ApiError } from '@/types';

/**
 * Cart-item PATCH/DELETE is owner-bound on the backend (handoff 2026-07-07): an
 * item id that is stale or was never the current user's now returns `404` and
 * leaves the row unchanged. Treat that 404 as a signal to resync the cart from
 * the server (drop the phantom item) instead of retrying the same id.
 */
export function isStaleCartItemError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as ApiError).statusCode === 404
  );
}
