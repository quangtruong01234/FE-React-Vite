import { type ReactElement, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/queryKeys';
import { roleSatisfies, type RequiredRole } from '@/lib/roleAccess';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: RequiredRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps): ReactElement | null {
  const { data: me, isLoading, isError } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => api.auth.me(),
    retry: false,
  });

  if (isLoading) return null;

  if (!me || isError) return <Navigate to="/login" replace />;

  if (!roleSatisfies(me.role.rol_name, requiredRole)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
