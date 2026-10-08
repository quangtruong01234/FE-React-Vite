import { describe, it, expect } from 'vitest';
import type { ReactElement, ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import { queryKeys } from '@/hooks/query/queryKeys';
import { useAddToCart } from './useCart';

function setup(): {
  queryClient: QueryClient;
  wrapper: ({ children }: { children: ReactNode }) => ReactElement;
} {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

function rejectAdd(status: number, errorCode?: string): void {
  server.use(
    http.post(`${API_BASE}/cart`, () =>
      HttpResponse.json({ message: 'refused', errorCode, data: null }, { status }),
    ),
  );
}

describe('useAddToCart', () => {
  it('marks the product stale when the cart refuses the add over stock (CART-STOCK-01)', async () => {
    rejectAdd(409, 'OUT_OF_STOCK');
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(queryKeys.products.withInventory('prod_a'), { id: 'prod_a' });
    const { result } = renderHook(() => useAddToCart(), { wrapper });

    act(() => {
      result.current.mutate({ productId: 'prod_a', quantity: 1 });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(
      queryClient.getQueryState(queryKeys.products.withInventory('prod_a'))?.isInvalidated,
    ).toBe(true);
  });

  it('leaves the product alone on an error that says nothing about stock', async () => {
    rejectAdd(500);
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(queryKeys.products.withInventory('prod_a'), { id: 'prod_a' });
    const { result } = renderHook(() => useAddToCart(), { wrapper });

    act(() => {
      result.current.mutate({ productId: 'prod_a', quantity: 1 });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(
      queryClient.getQueryState(queryKeys.products.withInventory('prod_a'))?.isInvalidated,
    ).toBe(false);
  });
});
