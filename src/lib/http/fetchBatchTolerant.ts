import type { ApiError } from '@/types';

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    (error as ApiError).statusCode === 404
  );
}

async function fanOut<T, TId>(ids: TId[], fetchOne: (id: TId) => Promise<T>): Promise<T[]> {
  const settled = await Promise.allSettled(ids.map(fetchOne));
  return settled.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
}

/**
 * Fetch a batch, tolerating a backend that loses the *whole* batch when any one
 * id is missing (e.g. `POST /products/with-inventory/multiple`). Falls back to
 * per-id fetches and keeps only the ones that resolve, so a single deleted
 * entity can't blank the entire result (cart/order hydration).
 *
 * Two triggers, because the backend has two ways of losing the batch:
 *
 * 1. **`404`** — the product service throws when an id is missing.
 * 2. **`200` with `[]`** — what actually reaches us today. BE confirmed
 *    (2026-08-27, SHAPE-01 hậu kiểm) the gateway wraps that call in a `.catch()`
 *    that flattens *every* product-service error into an empty array, so the 404
 *    never arrives. That is worse than a 404: there is nothing to catch, and one
 *    stale cart row renders the whole cart empty and blocks checkout with a
 *    bogus "Chỉ còn 0" on every line. An empty answer to a non-empty id list is
 *    therefore treated as unverified, not as fact.
 *
 * Case 2 costs one wasted fan-out when the ids really are all gone — the honest
 * answer either way is `[]`, and a cart of entirely dead products is rare. Once
 * BE ships partial-tolerant batching, trigger 1 goes quiet and trigger 2 only
 * fires on that genuinely-all-dead cart.
 *
 * Non-404 errors propagate so React Query can surface/retry them. The happy path
 * — a batch that returns anything at all — stays a single request.
 */
export async function fetchBatchTolerant<T, TId = number>(
  ids: TId[],
  fetchBatch: (ids: TId[]) => Promise<T[]>,
  fetchOne: (id: TId) => Promise<T>,
): Promise<T[]> {
  if (ids.length === 0) return [];
  let batch: T[];
  try {
    batch = await fetchBatch(ids);
  } catch (error) {
    if (!isNotFound(error)) throw error;
    return fanOut(ids, fetchOne);
  }
  return batch.length > 0 ? batch : fanOut(ids, fetchOne);
}
