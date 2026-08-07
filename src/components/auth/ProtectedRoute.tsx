import { type ReactElement, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import { roleSatisfies, type RequiredRole } from '@/lib/auth/roleAccess';
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

  if (!roleSatisfies(me.role.name, requiredRole)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
