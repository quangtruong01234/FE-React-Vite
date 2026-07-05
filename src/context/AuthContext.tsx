import { createContext, useContext, type ReactElement, type ReactNode } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import type { User } from '@/types';

interface AuthContextValue {
  currentUser: User | null;
  isLoading: boolean;
  loginSuccess: (user: User) => void;
  logout: (options?: { onSuccess?: () => void }) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
