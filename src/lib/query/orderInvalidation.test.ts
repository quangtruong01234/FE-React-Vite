import { describe, it, expect, vi } from 'vitest';
import type { QueryClient } from '@tanstack/react-query';
import { invalidateOrderViews } from './orderInvalidation';
import { queryKeys } from '@/hooks/query/queryKeys';

function fakeClient(): { client: QueryClient; invalidate: ReturnType<typeof vi.fn> } {
  const invalidate = vi.fn().mockResolvedValue(undefined);
  return { client: { invalidateQueries: invalidate } as unknown as QueryClient, invalidate };
}

describe('invalidateOrderViews', () => {
  it('all sweeps the orders prefix and nothing else', () => {
    const { client, invalidate } = fakeClient();
    invalidateOrderViews({ all: true, orderId: 5, seller: true }, client);
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.orders.all });
  });

  it('buyer-side cancel: detail + byUser', () => {
    const { client, invalidate } = fakeClient();
    invalidateOrderViews({ orderId: 7, buyerId: 3 }, client);
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.orders.detail(7) });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.orders.byUser(3) });
  });

  it('return request: detail + byUser + return lists', () => {
    const { client, invalidate } = fakeClient();
    invalidateOrderViews({ orderId: 7, buyerId: 3, returns: true }, client);
    expect(invalidate).toHaveBeenCalledTimes(3);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.orders.returnRequests });
  });

  it('seller-side confirm: seller lists + detail', () => {
    const { client, invalidate } = fakeClient();
    invalidateOrderViews({ orderId: 9, seller: true }, client);
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.orders.seller });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.orders.detail(9) });
  });

  it('empty scope invalidates nothing', () => {
    const { client, invalidate } = fakeClient();
    invalidateOrderViews({}, client);
    expect(invalidate).not.toHaveBeenCalled();
  });
});
