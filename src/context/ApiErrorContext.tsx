import { createContext, useContext, useState, type ReactNode, type ReactElement } from 'react';
import type { ApiError } from '@/types';

interface ApiErrorContextValue {
  globalError: ApiError | null;
  setGlobalError: (err: ApiError | null) => void;
}

const ApiErrorContext = createContext<ApiErrorContextValue | null>(null);

export function ApiErrorProvider({ children }: { children: ReactNode }): ReactElement {
  const [globalError, setGlobalError] = useState<ApiError | null>(null);
  return (
    <ApiErrorContext.Provider value={{ globalError, setGlobalError }}>
      {children}
    </ApiErrorContext.Provider>
  );
}

export function useApiError(): ApiErrorContextValue {
  const ctx = useContext(ApiErrorContext);
  if (!ctx) throw new Error('useApiError must be used within ApiErrorProvider');
  return ctx;
}
