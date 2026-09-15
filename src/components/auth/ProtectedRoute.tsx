import { type ReactElement, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import { roleSatisfies, sessionRole, type RequiredRole } from '@/lib/auth/roleAccess';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: RequiredRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps): ReactElement {
  const { data: me, isLoading, isError } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => api.auth.me(),
    retry: false,
  });

  if (isLoading) return <PageSkeleton />;

  if (!me || isError) return <Navigate to="/login" replace />;

  // `sessionRole(me)`, not `me.role.name`: the guard must agree with what the
  // backend enforces, which is the role inside the JWT. Gating on the stored
  // role let a just-promoted user into `/sell`, render the whole seller UI, and
  // only fail at submit with a 403 (ROLE-ADMIN-01, 2026-09-16).
  if (!roleSatisfies(sessionRole(me), requiredRole)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
