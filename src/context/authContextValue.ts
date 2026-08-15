import { createContext } from 'react';
import type { User } from '@/types';

export interface AuthContextValue {
  currentUser: User | null;
  isLoading: boolean;
  loginSuccess: (user: User) => void;
  logout: (options?: { onSuccess?: () => void }) => void;
}

/**
 * Lives apart from `AuthContext.tsx` on purpose: that file may export only the
 * provider component, otherwise `react-refresh/only-export-components` fires and
 * a Fast Refresh edit remounts the whole tree instead of patching it.
 */
export const AuthContext = createContext<AuthContextValue | null>(null);
