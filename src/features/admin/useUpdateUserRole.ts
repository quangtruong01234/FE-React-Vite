import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import type { RoleName, User } from '@/types';

export interface UpdateUserRoleVars {
  userId: string;
  role: RoleName;
}

/**
 * ROLE-ADMIN-01 — `PATCH /user/:id/role`, admin only.
 *
 * Invalidates the whole `users` prefix rather than patching the row in place:
 * the response is the updated user, but the list is paginated with
 * `keepPreviousData`, so a refetch is what keeps every cached page honest.
 * Nothing else in the cache moves — promoting to `shop` creates no shop row and
 * emits no event backend-side.
 */
export function useUpdateUserRole(): UseMutationResult<User, unknown, UpdateUserRoleVars> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: UpdateUserRoleVars) => api.users.updateRole(userId, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (error: unknown) => {
      console.error('Đổi vai trò người dùng thất bại', error);
    },
  });
}
