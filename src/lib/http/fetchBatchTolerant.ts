import type { ApiError } from '@/types';

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    (error as ApiError).statusCode === 404
  );
}

/**
 * Fetch a batch, tolerating a backend that 404s the *whole* batch when any one
 * id is missing (e.g. `POST /products/with-inventory/multiple`). On a 404 it
 * falls back to per-id fetches and keeps only the ones that resolve, so a single
 * deleted entity can't blank the entire result (cart/order hydration).
 *
 * Non-404 errors propagate so React Query can surface/retry them. The happy path
 * stays a single batch request — the fan-out only happens on a 404.
 */
export async function fetchBatchTolerant<T, TId = number>(
  ids: TId[],
  fetchBatch: (ids: TId[]) => Promise<T[]>,
  fetchOne: (id: TId) => Promise<T>,
): Promise<T[]> {
  if (ids.length === 0) return [];
  try {
    return await fetchBatch(ids);
  } catch (error) {
    if (!isNotFound(error)) throw error;
    const settled = await Promise.allSettled(ids.map(fetchOne));
    return settled.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    );
  }
}
