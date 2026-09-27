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
    invalidateOrderViews({ all: true, orderId: 'ord_5', seller: true }, client);
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.orders.all });
  });

  it('buyer-side cancel: detail + byUser', () => {
    const { client, invalidate } = fakeClient();
    invalidateOrderViews({ orderId: 'ord_7', buyerId: 'usr_3' }, client);
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.orders.detail('ord_7') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.orders.byUser('usr_3') });
  });

  it('vouchers sweeps the checkout suggestion list for every basket', () => {
    const { client, invalidate } = fakeClient();
    invalidateOrderViews({ orderId: 'ord_7', buyerId: 'usr_3', vouchers: true }, client);
    expect(invalidate).toHaveBeenCalledTimes(3);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.orders.availableVouchersAll });
  });

  it('the voucher prefix covers every basket key but no voucher console', () => {
    const prefix: readonly string[] = queryKeys.orders.availableVouchersAll;
    const startsWith = (key: readonly string[]): boolean =>
      prefix.every((part, i) => key[i] === part);
    expect(startsWith(queryKeys.orders.availableVouchers('sig-a'))).toBe(true);
    expect(startsWith(queryKeys.orders.sellerVouchers)).toBe(false);
    expect(startsWith(queryKeys.orders.adminVouchers)).toBe(false);
  });

  it('return request: detail + byUser + return lists', () => {
    const { client, invalidate } = fakeClient();
    invalidateOrderViews({ orderId: 'ord_7', buyerId: 'usr_3', returns: true }, client);
    expect(invalidate).toHaveBeenCalledTimes(3);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.orders.returnRequests });
  });

  it('seller-side confirm: seller lists + detail', () => {
    const { client, invalidate } = fakeClient();
    invalidateOrderViews({ orderId: 'ord_9', seller: true }, client);
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.orders.seller });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.orders.detail('ord_9') });
  });

  it('empty scope invalidates nothing', () => {
    const { client, invalidate } = fakeClient();
    invalidateOrderViews({}, client);
    expect(invalidate).not.toHaveBeenCalled();
  });
});
