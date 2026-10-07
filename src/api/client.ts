import type { ApiError } from '@/types';
import { shouldRedirectToLogin, buildLoginRedirect } from './unauthorized';
import { overloadRetryDelayMs } from './retry';

export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

type NavigateFn = (to: string) => void;
let handleUnauthorized: NavigateFn = () => {};
export function registerUnauthorizedHandler(fn: NavigateFn): void {
  handleUnauthorized = fn;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export interface RequestOptions extends RequestInit {
  skipUnauthorizedRedirect?: boolean;
  /** Opt out of the one delayed 503 resend. For endpoints whose 503 comes from the
   *  handler itself (it ran, so a resend spends another rate-limit slot) and whose
   *  contract forbids auto-retry — e.g. PRODUCT-QA-01 `ASSISTANT_UNAVAILABLE`. */
  skipOverloadRetry?: boolean;
}

export async function request<T>(path: string, init?: RequestOptions): Promise<T> {
  const { skipUnauthorizedRedirect, skipOverloadRetry, ...fetchInit } = init ?? {};
  const send = (): Promise<Response> => fetch(`${API_BASE}${path}`, {
    ...fetchInit,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...fetchInit?.headers },
  });
  let res = await send();
  // Backend sheds excess load early with 503 + Retry-After (SCALE-05); the shed
  // request never reached the handler, so a single delayed retry is safe for any method.
  const retryDelay = skipOverloadRetry ? null : overloadRetryDelayMs(res.status, res.headers.get('Retry-After'));
  if (retryDelay !== null) {
    await sleep(retryDelay);
    res = await send();
  }
  if (!res.ok) {
    if (shouldRedirectToLogin(res.status, skipUnauthorizedRedirect)) {
      handleUnauthorized(buildLoginRedirect(window.location.pathname));
    }
    const err = await res.json().catch(() => ({})) as { message?: string; errorCode?: unknown };
    const apiError: ApiError = { statusCode: res.status, status: res.status, message: err.message ?? res.statusText };
    // Forwarded only when the body really carries one, so callers can keep
    // testing `errorCode === '...'` and get `undefined` for every other error
    // rather than a key that exists but means nothing.
    if (typeof err.errorCode === 'string') apiError.errorCode = err.errorCode;
    throw apiError;
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }
  const json = await res.json() as T | { data: T };
  if (json !== null && typeof json === 'object' && 'data' in json && !Array.isArray(json)) {
    return (json as { data: T }).data;
  }
  return json as T;
}

export function toQuery(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (!entries.length) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

// LIST-SEARCH-01: every list search param (`q`, or `search` on the social
// routes) is trimmed server-side, treats blank as "no filter" and answers 400
// past 100 chars. Trim + cap here so an over-long paste narrows instead of
// erroring, and a blank term drops out of the URL through `toQuery`.
export const LIST_SEARCH_MAX = 100;

export function toSearchTerm(raw?: string): string | undefined {
  const term = raw?.trim().slice(0, LIST_SEARCH_MAX);
  return term || undefined;
}
