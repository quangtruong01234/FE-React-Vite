import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Parse a `?page=` search-param value into a 1-based page number.
 * Anything that is not a positive integer (missing, "0", "-3", "abc", "2.5")
 * falls back to page 1 so a hand-edited URL can never break the list query.
 */
export function parsePageParam(raw: string | null): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/**
 * Pagination state stored in the URL (`?page=2`) instead of `useState`, so the
 * current page survives reload, is shareable, and back/forward steps through
 * pages. Drop-in replacement for `useState(1)` + `<Pagination onPageChange>`.
 *
 * - Page 1 removes the param (clean default URL).
 * - `param` supports pages with two independent lists (e.g. ProfilePage uses
 *   `postsPage` / `productsPage`).
 * - Setter uses the functional form so several URL updates in one handler
 *   (e.g. a filter setter that also resets the page) compose safely.
 */
export function usePageParam(param = 'page'): [number, (page: number) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePageParam(searchParams.get(param));

  const setPage = useCallback(
    (next: number) => {
      setSearchParams((prev) => {
        const sp = new URLSearchParams(prev);
        if (next <= 1) {
          sp.delete(param);
        } else {
          sp.set(param, String(next));
        }
        return sp;
      });
    },
    [param, setSearchParams],
  );

  return [page, setPage];
}
