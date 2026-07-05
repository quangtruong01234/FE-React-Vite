import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
  type ReactElement,
} from 'react';
import type { ApiError } from '@/types';

interface ApiErrorContextValue {
  globalError: ApiError | null;
  setGlobalError: (err: ApiError | null) => void;
}

const ApiErrorContext = createContext<ApiErrorContextValue | null>(null);

export function ApiErrorProvider({ children }: { children: ReactNode }): ReactElement {
  const [globalError, setGlobalError] = useState<ApiError | null>(null);
  // Memoize so consumers don't re-render on unrelated provider renders
  // (setGlobalError from useState is already identity-stable).
  const value = useMemo(() => ({ globalError, setGlobalError }), [globalError]);
  return <ApiErrorContext.Provider value={value}>{children}</ApiErrorContext.Provider>;
}

export function useApiError(): ApiErrorContextValue {
  const ctx = useContext(ApiErrorContext);
  if (!ctx) throw new Error('useApiError must be used within ApiErrorProvider');
  return ctx;
}
