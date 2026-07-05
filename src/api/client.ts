import type { ApiError } from '@/types';
import { shouldRedirectToLogin, buildLoginRedirect } from './unauthorized';

export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

type NavigateFn = (to: string) => void;
let handleUnauthorized: NavigateFn = () => {};
export function registerUnauthorizedHandler(fn: NavigateFn): void {
  handleUnauthorized = fn;
}

export async function request<T>(path: string, init?: RequestInit & { skipUnauthorizedRedirect?: boolean }): Promise<T> {
  const { skipUnauthorizedRedirect, ...fetchInit } = init ?? {};
  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchInit,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...fetchInit?.headers },
  });
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
