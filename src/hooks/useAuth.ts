import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/queryKeys';
import type { User } from '@/types';

interface AuthState {
  currentUser: User | null;
  isLoading: boolean;
  loginSuccess: (user: User) => void;
  handleUnauthorized: () => void;
  logout: () => void;
}

export function useAuth(): AuthState {
  const queryClient = useQueryClient();

  const { data: currentUser = null, isLoading } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: api.auth.me,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const { mutate: logoutMutate } = useMutation({
    mutationFn: () => api.auth.logout(),
    onSettled: () => {
      queryClient.clear();
    },
  });

  function loginSuccess(user: User): void {
    queryClient.clear();
    queryClient.setQueryData<User>(queryKeys.auth.me, user);
  }

  function handleUnauthorized(): void {
    queryClient.clear();
  }

  function logout(): void {
    logoutMutate();
  }

  return { currentUser, isLoading, loginSuccess, handleUnauthorized, logout };
}
