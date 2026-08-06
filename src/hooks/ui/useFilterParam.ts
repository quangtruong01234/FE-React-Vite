import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Validate a filter search-param against its allowed values — anything else
 * (missing, tampered) falls back to the default so a shared URL can't put the
 * page in an impossible filter state.
 */
export function parseFilterParam<T extends string>(
  raw: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(raw as T) ? (raw as T) : fallback;
}

/**
 * Enum-like filter state (status tabs, type filters) stored in the URL, so the
 * active tab survives reload and lands in shared links. Companion to
 * `usePageParam`:
 *
 * - The default value removes the param (clean URL).
 * - Changing the filter also drops `?page=` — a new filter restarts pagination,
 *   in ONE history entry (no stale page-N request in between).
 */
export function useFilterParam<T extends string>(
  param: string,
  allowed: readonly T[],
  fallback: T,
): [T, (value: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = parseFilterParam(searchParams.get(param), allowed, fallback);

  const setValue = useCallback(
    (next: T) => {
      setSearchParams((prev) => {
        const sp = new URLSearchParams(prev);
        if (next === fallback) {
          sp.delete(param);
        } else {
          sp.set(param, next);
        }
        sp.delete('page');
        return sp;
      });
    },
    [param, fallback, setSearchParams],
  );

  return [value, setValue];
}
