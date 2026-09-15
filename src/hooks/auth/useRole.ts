import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import { canSell, canAdminister, hasStaleRole, sessionRole } from '@/lib/auth/roleAccess';
import type { CurrentUser } from '@/types';

interface RoleState {
  me: CurrentUser;
  /**
   * The role of the **session** (the JWT), not of the database row — this is
   * what every gate below is derived from. Read `me.role.name` directly when you
   * want the stored role for display.
   */
  roleName: string;
  isSeller: boolean;
  isAdmin: boolean;
  /** The stored role has moved on from the session's — see `RoleStaleBanner`. */
  isRoleStale: boolean;
}

export function useRole(): RoleState | undefined {
  const { data: me } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => api.auth.me(),
    retry: false,
  });

  if (!me) return undefined;

  const roleName = sessionRole(me);

  return {
    me,
    roleName,
    isSeller: canSell(roleName),
    isAdmin: canAdminister(roleName),
    isRoleStale: hasStaleRole(me),
  };
}
