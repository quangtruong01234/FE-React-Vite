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

export async function request<T>(path: string, init?: RequestInit & { skipUnauthorizedRedirect?: boolean }): Promise<T> {
  const { skipUnauthorizedRedirect, ...fetchInit } = init ?? {};
  const send = (): Promise<Response> => fetch(`${API_BASE}${path}`, {
    ...fetchInit,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...fetchInit?.headers },
  });
  let res = await send();
  // Backend sheds excess load early with 503 + Retry-After (SCALE-05); the shed
  // request never reached the handler, so a single delayed retry is safe for any method.
  const retryDelay = overloadRetryDelayMs(res.status, res.headers.get('Retry-After'));
  if (retryDelay !== null) {
    await sleep(retryDelay);
    res = await send();
  }
  if (!res.ok) {
    if (shouldRedirectToLogin(res.status, skipUnauthorizedRedirect)) {
      handleUnauthorized(buildLoginRedirect(window.location.pathname));
    }
    const err = await res.json().catch(() => ({})) as { message?: string };
    const apiError: ApiError = { statusCode: res.status, status: res.status, message: err.message ?? res.statusText };
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
