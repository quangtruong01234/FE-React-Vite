import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import { postAuthEvent, subscribeAuthEvents } from '@/lib/auth/authChannel';
import type { User } from '@/types';

interface AuthState {
  currentUser: User | null;
  isLoading: boolean;
  loginSuccess: (user: User) => void;
  logout: (options?: { onSuccess?: () => void }) => void;
}

export function useAuth(): AuthState {
  const queryClient = useQueryClient();

  const { data: currentUser = null, isLoading } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: api.auth.me,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Another tab changed the session (login/logout). resetQueries, not clear():
  // clear() removes cache entries without notifying active observers, so the
  // page would keep rendering stale data. Reset wipes data AND refetches
  // active queries — auth.me comes back 401 → ProtectedRoute redirects.
  useEffect(() => {
    return subscribeAuthEvents(() => {
      void queryClient.resetQueries();
    });
  }, [queryClient]);

  const { mutate: logoutMutate } = useMutation({
    mutationFn: () => api.auth.logout(),
    onSettled: () => {
      queryClient.clear();
      postAuthEvent({ type: 'logout' });
    },
  });

  const loginSuccess = useCallback(
    (user: User): void => {
      queryClient.clear();
      queryClient.setQueryData<User>(queryKeys.auth.me, user);
      postAuthEvent({ type: 'login' });
    },
    [queryClient],
  );

  const logout = useCallback(
    (options?: { onSuccess?: () => void }): void => {
      logoutMutate(undefined, { onSuccess: options?.onSuccess });
    },
    [logoutMutate],
  );

  // Memoize so the Context value object (AuthContext) keeps a stable identity
  // across renders — a change in one field shouldn't re-render every consumer.
  return useMemo(
    () => ({ currentUser, isLoading, loginSuccess, logout }),
    [currentUser, isLoading, loginSuccess, logout],
  );
}
