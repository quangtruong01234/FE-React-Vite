import { type ReactElement, type ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/queryKeys';
import { useAuthContext } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'shop';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps): ReactElement | null {
  const { handleUnauthorized } = useAuthContext();
  const { data: me, isLoading, isError } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => api.auth.me(),
    retry: false,
  });

  useEffect(() => {
    if (isError) handleUnauthorized();
  }, [isError, handleUnauthorized]);

  if (isLoading) return null;

  if (!me) return <Navigate to="/login" replace />;

  const isAdmin = me.role.rol_name === 'admin';
  const isSeller = me.role.rol_name === 'shop';

  if (requiredRole === 'admin' && !isAdmin) return <Navigate to="/" replace />;

  if (requiredRole === 'shop' && !(isSeller || isAdmin)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
