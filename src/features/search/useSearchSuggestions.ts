import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { useRole } from '@/hooks/auth/useRole';
import { queryKeys } from '@/hooks/query/queryKeys';
import {
  buildSuggestions,
  foldText,
  SEARCH_MIN_QUERY_LENGTH,
  SUGGESTION_LIMITS,
  type Suggestion,
} from './searchSuggestions';

/** A re-typed query should hit the cache, not the network, for a short while. */
const SUGGESTION_STALE_TIME = 60 * 1000;

interface SearchSuggestionsResult {
  suggestions: Suggestion[];
  /** True only while the first fetch for a query is in flight. */
  isLoading: boolean;
  /** Neither public search (products, posts) could be fetched. */
  isError: boolean;
  /** False while the query is still too short to search on. */
  enabled: boolean;
}

/**
 * Suggestions for the header search box: one server-side search per group
 * (SEARCH-01). Pass an already-debounced query — every distinct value here is a
 * cache key and up to three requests.
 */
export function useSearchSuggestions(query: string): SearchSuggestionsResult {
  // Session read from the `auth.me` query, NOT from `useAuthContext()`: after an
  // in-app login `loginSuccess` calls `queryClient.clear()`, which drops the
  // provider's cached user without notifying its observer, so the context keeps
  // reporting `null` until the whole page reloads. Every other gate in the app
  // (`ProtectedRoute`, `useRole`) reads the query for the same reason.
  const session = useRole();
  const trimmed = query.trim();
  const enabled = foldText(trimmed).length >= SEARCH_MIN_QUERY_LENGTH;

  const productParams = { search: trimmed, limit: SUGGESTION_LIMITS.product };
  const products = useQuery({
    queryKey: queryKeys.products.list(productParams),
    queryFn: () => api.products.getList(productParams),
    enabled,
  });

  const posts = useQuery({
    queryKey: queryKeys.search.posts(trimmed, SUGGESTION_LIMITS.post),
    queryFn: () => api.social.getFeed(1, SUGGESTION_LIMITS.post, trimmed),
    enabled,
    staleTime: SUGGESTION_STALE_TIME,
  });

  // `GET /user/search` is JWT-guarded: for a signed-out visitor it can only
  // ever answer 401, so the seller group is simply left out rather than asked for.
  const sellers = useQuery({
    queryKey: queryKeys.search.users(trimmed, SUGGESTION_LIMITS.seller),
    queryFn: () => api.users.searchUsers(trimmed, SUGGESTION_LIMITS.seller),
    enabled: enabled && session !== undefined,
    staleTime: SUGGESTION_STALE_TIME,
  });

  const suggestions = useMemo(
    () =>
      buildSuggestions({
        query: trimmed,
        products: products.data?.data ?? [],
        posts: posts.data?.data ?? [],
        sellers: sellers.data ?? [],
      }),
    [trimmed, products.data, posts.data, sellers.data],
  );

  return {
    suggestions,
    // A failing group shows itself empty rather than blocking the others.
    isLoading: enabled && (products.isLoading || posts.isLoading || sellers.isLoading),
    isError: products.isError && posts.isError,
    enabled,
  };
}
