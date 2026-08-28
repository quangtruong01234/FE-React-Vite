import { type ReactElement } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { RootErrorBoundary } from '@/components/shared/ErrorBoundary';
import { queryClient } from '@/lib/query/queryClient';
import { router } from './router';

export default function App(): ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <RootErrorBoundary>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </RootErrorBoundary>
    </QueryClientProvider>
  );
}
