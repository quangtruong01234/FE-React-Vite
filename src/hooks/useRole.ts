import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/queryKeys';
import type { User } from '@/types';

interface RoleState {
  me: User;
  role: string;
  isSeller: boolean;
  isAdmin: boolean;
}

export function useRole(): RoleState | undefined {
  const { data: me } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => api.auth.me(),
    retry: false,
  });

  if (!me) return undefined;

  return {
    me,
    role: me.role,
    isSeller: me.role === 'seller',
    isAdmin: me.role === 'admin',
  };
}
