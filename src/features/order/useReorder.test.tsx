import { describe, it, expect } from 'vitest';
import type { ReactElement, ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import { queryKeys } from '@/hooks/query/queryKeys';
import type { AddToCartDto, OrderItem, ServerCart, ServerCartItem } from '@/types';
import { useReorder } from './useReorder';

function orderItem(id: number, productId: string | null, skuId: number | null = null): OrderItem {
  return { id, productId, quantity: 2, price: 100, skuId, productName: `SP ${id}` };
}

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

/** In-memory cart behind `POST /cart`; `prod_fail` is rejected like a 400. */
function stubBackend(): AddToCartDto[] {
  const adds: AddToCartDto[] = [];
  const lines: ServerCartItem[] = [{
    id: 1, cartId: 10, productId: 'prod_old', skuId: null, skuTierIdx: null, quantity: 1,
    createdAt: '', updatedAt: '',
  }];
  server.use(
    http.post(`${API_BASE}/products/with-inventory/multiple`, () =>
      HttpResponse.json({
        data: ['prod_a', 'prod_b', 'prod_fail'].map((id) => ({
          id, isActive: true, inventory: { availableStock: 5 }, skus: [],
        })),
      }),
    ),
    http.post(`${API_BASE}/cart`, async ({ request }) => {
      const dto = (await request.json()) as AddToCartDto;
      adds.push(dto);
      if (dto.productId === 'prod_fail') {
        return HttpResponse.json({ message: 'Bad request' }, { status: 400 });
      }
      lines.push({
        id: 100 + lines.length, cartId: 10, productId: dto.productId, skuId: dto.skuId ?? null,
        skuTierIdx: null, quantity: dto.quantity, createdAt: '', updatedAt: '',
      });
      const cart: ServerCart = { id: 10, userId: 'usr_1', items: [...lines] };
      return HttpResponse.json({ data: cart });
    }),
  );
  return adds;
}

describe('useReorder', () => {
  it('re-adds buyable lines one by one and returns the cart line ids they landed on', async () => {
    const adds = stubBackend();
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useReorder(), { wrapper });

    act(() => {
      result.current.mutate([orderItem(1, 'prod_a'), orderItem(2, null), orderItem(3, 'prod_b')]);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(adds.map((a) => a.productId)).toEqual(['prod_a', 'prod_b']);
    expect(result.current.data?.cartLineIds).toEqual([101, 102]);
    expect(result.current.data?.skipped.map((s) => [s.item.id, s.reason])).toEqual([[2, 'deleted']]);
    // The final server cart is in the cache before /cart mounts.
    expect(
      queryClient.getQueryData<ServerCart>(queryKeys.cart.all)?.items.map((i) => i.id),
    ).toEqual([1, 101, 102]);
  });

  it('reports a line the cart rejected as failed and keeps the rest', async () => {
    stubBackend();
    const { wrapper } = setup();
    const { result } = renderHook(() => useReorder(), { wrapper });

    act(() => {
      result.current.mutate([orderItem(1, 'prod_fail'), orderItem(2, 'prod_a')]);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.cartLineIds).toEqual([101]);
    expect(result.current.data?.skipped.map((s) => [s.item.id, s.reason])).toEqual([[1, 'failed']]);
  });

  it('names the CART-STOCK-01 409 reason instead of a bare failure', async () => {
    stubBackend();
    server.use(
      http.post(`${API_BASE}/cart`, async ({ request }) => {
        const dto = (await request.json()) as AddToCartDto;
        const errorCode = dto.productId === 'prod_a' ? 'OUT_OF_STOCK' : 'PRODUCT_INACTIVE';
        return HttpResponse.json({ message: 'x', errorCode, data: null }, { status: 409 });
      }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useReorder(), { wrapper });

    act(() => {
      result.current.mutate([orderItem(1, 'prod_a'), orderItem(2, 'prod_b')]);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.skipped.map((s) => [s.item.id, s.reason])).toEqual([
      [1, 'outOfStock'],
      [2, 'unavailable'],
    ]);
  });

  it('fails as a whole when the product lookup fails, adding nothing', async () => {
    const adds = stubBackend();
    server.use(
      http.post(`${API_BASE}/products/with-inventory/multiple`, () =>
        HttpResponse.json({ message: 'Bad gateway' }, { status: 502 }),
      ),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useReorder(), { wrapper });

    act(() => {
      result.current.mutate([orderItem(1, 'prod_a')]);
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(adds).toEqual([]);
  });
});
