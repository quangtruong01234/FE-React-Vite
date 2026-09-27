import { hashKey, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/query/queryKeys';
import type { User } from '@/types';

/**
 * Swap the session held in the query cache: drop every cached read that
 * belonged to the previous session, then write the new one into `auth.me`
 * (`null` = signed out).
 *
 * Not `queryClient.clear()`: that removes `auth.me` too, without notifying its
 * observers. `AuthProvider` sits above the router, so no navigation re-renders
 * it — its observer stays attached to the dead entry and `currentUser` keeps
 * the pre-login (or pre-logout!) value until a full reload. Keeping the entry
 * and overwriting it notifies every observer in place.
 */
export function replaceSessionCache(queryClient: QueryClient, user: User | null): void {
  const meHash = hashKey(queryKeys.auth.me);
  queryClient.removeQueries({ predicate: (query) => query.queryHash !== meHash });
  queryClient.getMutationCache().clear();
  queryClient.setQueryData<User | null>(queryKeys.auth.me, user);
}
