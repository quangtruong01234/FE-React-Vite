import type { LoaderFunctionArgs } from 'react-router-dom';
import { queryClient } from '@/lib/query/queryClient';
import { whenBackendBootstrapped } from '@/lib/demo/bootstrap';
import { marketplaceProductParams, parseMarketplaceFilters } from './marketplaceUrl';
import { productListQuery } from './useProducts';

/**
 * Start the product-list request as soon as `/marketplace` matches, instead of
 * after the page renders. Without it the grid's LCP image sits at the end of a
 * serial chain: `/user/me` (ProtectedRoute) → MarketplacePage chunk → list
 * request → image. With it, the list request runs alongside the first two.
 *
 * Fire-and-forget: returns `null` at once so navigation never waits on it, and
 * `MarketplacePage`'s own `useProducts` picks the in-flight or cached result up
 * under the same key (`staleTime` 60s ⇒ no second request).
 */
export function marketplaceLoader({ request }: LoaderFunctionArgs): null {
  const params = marketplaceProductParams(parseMarketplaceFilters(new URL(request.url).searchParams));
  void whenBackendBootstrapped().then(() => queryClient.prefetchQuery(productListQuery(params)));
  return null;
}
