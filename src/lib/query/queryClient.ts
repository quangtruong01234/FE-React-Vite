import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { isDemoMode } from '@/lib/demo/backendStatus';
import type { ApiError } from '@/types';

type ErrorHandler = (err: ApiError) => void;
let onApiError: ErrorHandler = () => {};
export function registerApiErrorHandler(fn: ErrorHandler): void {
  onApiError = fn;
}

function handleError(error: unknown): void {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const apiErr = error as ApiError;
    // 401 handled by registerUnauthorizedHandler in api/index.ts — skip here
    if (apiErr.statusCode !== 401) {
      onApiError(apiErr);
    }
  }
}

/**
 * One attempt per mount while the backend is parked (DEMO-RETRY-01).
 *
 * Demo mode answers anything unmocked with 503, and retrying cannot change
 * that — it only doubles the red lines in the visitor's console and the billed
 * Worker invocations. `demoHandlers` is meant to cover every read a visitor can
 * reach; this is the net under it, so a read added later and forgotten there
 * costs one attempt instead of two.
 *
 * A function rather than `retry: isDemoMode() ? 0 : 1` because this module is
 * evaluated at import time — before `bootstrapBackendStatus()` has resolved the
 * probe — so a value read here would always be the `online` default.
 */
export function retryQuery(failureCount: number): boolean {
  return isDemoMode() ? false : failureCount < 1;
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleError }),
  mutationCache: new MutationCache({ onError: handleError }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: retryQuery,
      refetchOnWindowFocus: false,
    },
  },
});
