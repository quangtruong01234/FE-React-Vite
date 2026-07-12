import { describe, it, expect } from 'vitest';
import type { ReactElement, ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import { useProducts } from './useProducts';
import type { PaginatedResponse, ProductWithInventory } from '@/types';

function productPage(page: number): PaginatedResponse<ProductWithInventory> {
  return {
    data: [{ id: page * 10, name: `SP trang ${page}` } as unknown as ProductWithInventory],
    total: 2,
    page,
    limit: 1,
    totalPages: 2,
    hasNext: page < 2,
  };
}

function setup(): { wrapper: ({ children }: { children: ReactNode }) => ReactElement } {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper };
}

function stubProductListByPage(): void {
  server.use(
    http.get(`${API_BASE}/products/with-inventory/all`, ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page') ?? 1);
      return HttpResponse.json({ data: productPage(page) });
    }),
  );
}

describe('useProducts — pagination keeps previous data', () => {
  it('keeps page-1 data rendered as placeholder while page 2 fetches, then swaps', async () => {
    stubProductListByPage();
    const { wrapper } = setup();
    const { result, rerender } = renderHook(({ page }) => useProducts({ page, limit: 1 }), {
      wrapper,
      initialProps: { page: 1 },
    });
    await waitFor(() => expect(result.current.data?.page).toBe(1));

    rerender({ page: 2 });

    // The regression this guards: without keepPreviousData the page flip drops
    // to `data: undefined` (empty-grid flash on Marketplace) until page 2 resolves.
    expect(result.current.data?.page).toBe(1);
    expect(result.current.isFetching).toBe(true);

    await waitFor(() => expect(result.current.data?.page).toBe(2));
    expect(result.current.isFetching).toBe(false);
  });
});
