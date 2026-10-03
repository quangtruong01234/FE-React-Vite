import { type ReactElement } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { RootErrorBoundary } from '@/components/shared/ErrorBoundary';
import { BackendOfflineBanner } from '@/components/layout/BackendOfflineBanner';
import { queryClient } from '@/lib/query/queryClient';
import { router } from './router';

export default function App(): ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Outside the root boundary so its crash panel can still read the language. */}
      <LanguageProvider>
        <RootErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              {/* Above the router so it also covers `/login`. Renders null unless
                  the startup health probe found the gateway away. */}
              <BackendOfflineBanner />
              <RouterProvider router={router} />
            </AuthProvider>
          </ThemeProvider>
        </RootErrorBoundary>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
