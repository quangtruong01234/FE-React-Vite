import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LoaderFunctionArgs } from 'react-router-dom';
import { queryClient } from '@/lib/query/queryClient';
import { queryKeys } from '@/hooks/query/queryKeys';
import { marketplaceLoader } from './marketplaceLoader';
import { marketplaceProductParams, parseMarketplaceFilters } from './marketplaceUrl';

let releaseBootstrap: () => void = () => {};
vi.mock('@/lib/demo/bootstrap', () => ({
  whenBackendBootstrapped: () => new Promise<void>((resolve) => {
    releaseBootstrap = resolve;
  }),
}));

function load(url: string): null {
  const args = { request: new Request(url), params: {}, context: undefined } as unknown as LoaderFunctionArgs;
  return marketplaceLoader(args);
}

describe('marketplaceLoader', () => {
  const prefetch = vi.spyOn(queryClient, 'prefetchQuery').mockResolvedValue(undefined);

  beforeEach(() => prefetch.mockClear());
  afterEach(() => releaseBootstrap());

  it('returns at once so navigation never waits on the request', () => {
    expect(load('http://localhost/marketplace')).toBeNull();
  });

  it('holds the request until bootstrap settles (demo-mode mocks must be up first)', async () => {
    load('http://localhost/marketplace');
    await Promise.resolve();
    expect(prefetch).not.toHaveBeenCalled();

    releaseBootstrap();
    await vi.waitFor(() => expect(prefetch).toHaveBeenCalledTimes(1));
  });

  it('prefetches under the exact key MarketplacePage reads for the same URL', async () => {
    const query = 'category=3&sort=price_desc&page=2';
    load(`http://localhost/marketplace?${query}`);
    releaseBootstrap();

    await vi.waitFor(() => expect(prefetch).toHaveBeenCalledTimes(1));
    const expected = marketplaceProductParams(parseMarketplaceFilters(new URLSearchParams(query)));
    expect(prefetch.mock.calls[0][0].queryKey).toEqual(queryKeys.products.list(expected));
  });
});
