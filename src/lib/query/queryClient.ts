import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
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

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleError }),
  mutationCache: new MutationCache({ onError: handleError }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
