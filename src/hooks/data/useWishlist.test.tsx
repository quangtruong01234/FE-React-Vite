import { describe, it, expect } from 'vitest';
import type { ReactElement, ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import { useWishlistPage } from './useWishlist';
import type { PaginatedResponse, WishlistItem } from '@/types';

function wishlistPage(page: number): PaginatedResponse<WishlistItem> {
  return {
    data: [{ id: page * 100, productId: page * 100, product: { id: page * 100, name: `SP trang ${page}` } } as unknown as WishlistItem],
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

function stubWishlistByPage(): void {
  server.use(
    http.get(`${API_BASE}/products/wishlist`, ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page') ?? 1);
      return HttpResponse.json({ data: wishlistPage(page) });
    }),
  );
}

describe('useWishlistPage — pagination keeps previous data', () => {
  it('loads the requested page', async () => {
    stubWishlistByPage();
    const { wrapper } = setup();
    const { result } = renderHook(() => useWishlistPage(1, 1), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.page).toBe(1);
    expect(result.current.isPlaceholderData).toBe(false);
  });

  it('keeps page-1 data rendered as placeholder while page 2 fetches, then swaps', async () => {
    stubWishlistByPage();
    const { wrapper } = setup();
    const { result, rerender } = renderHook(({ page }) => useWishlistPage(page, 1), {
      wrapper,
      initialProps: { page: 1 },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ page: 2 });

    // The regression this guards: without keepPreviousData the page flip drops
    // to `data: undefined` (empty-list flash) until page 2 resolves.
    expect(result.current.data?.page).toBe(1);
    expect(result.current.isPlaceholderData).toBe(true);

    await waitFor(() => expect(result.current.data?.page).toBe(2));
    expect(result.current.isPlaceholderData).toBe(false);
  });
});
