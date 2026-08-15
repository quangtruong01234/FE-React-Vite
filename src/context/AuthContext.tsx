import { type ReactElement, type ReactNode } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { AuthContext } from '@/context/authContextValue';

// Provider only — the context object lives in `authContextValue.ts` and the
// consumer hook in `useAuthContext.ts`. Exporting a non-component from here
// costs Fast Refresh: React would remount every consumer on each edit.
export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
