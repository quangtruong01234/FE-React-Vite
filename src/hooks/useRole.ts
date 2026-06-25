import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/queryKeys';
import { canSell, canAdminister } from '@/lib/roleAccess';
import type { User } from '@/types';

interface RoleState {
  me: User;
  roleName: string;
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

  const roleName = me.role.rol_name;

  return {
    me,
    roleName,
    isSeller: canSell(roleName),
    isAdmin: canAdminister(roleName),
  };
}
