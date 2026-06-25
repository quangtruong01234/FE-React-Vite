import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

interface Options {
  route?: string;
}

/**
 * Render a component inside the providers it needs at runtime: a fresh
 * QueryClient (retries off so failed queries settle immediately) and a router.
 * Use for any component that calls a query/mutation hook or `<Link>`.
 */
export function renderWithProviders(ui: ReactElement, { route = '/' }: Options = {}): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}
