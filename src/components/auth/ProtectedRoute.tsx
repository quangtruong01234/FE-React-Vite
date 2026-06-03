import { type ReactElement, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/queryKeys';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'seller';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps): ReactElement | null {
  const { data: me, isLoading } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => api.auth.me(),
    retry: false,
  });

  if (isLoading) return null;

  if (!me) return <Navigate to="/login" replace />;

  const isAdmin = me.role === 'admin';
  const isSeller = me.role === 'seller';

  if (requiredRole === 'admin' && !isAdmin) return <Navigate to="/" replace />;

  if (requiredRole === 'seller' && !(isSeller || isAdmin)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
