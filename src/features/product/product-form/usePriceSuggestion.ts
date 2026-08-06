import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import { useDebouncedValue } from '@/hooks/ui/useDebouncedValue';
import type { ProductCondition } from '@/types';
import { buildPriceSuggestionParams, priceSuggestionView, type PriceSuggestionView } from './priceSuggestion';

/**
 * Advisory catalog price stats for the seller product form (AI-01). Fetches
 * only once a category is selected; category/brand/condition changes are
 * debounced so rapid toggling doesn't fire a request per click. Returns `null`
 * while hidden (no category, too few samples, loading, or error) — the hint is
 * advisory, so failures stay silent.
 */
export function usePriceSuggestion(
  categoryIds: number[],
  brandId: number | null,
  condition: ProductCondition,
): PriceSuggestionView | null {
  // Memoized on primitives so the debounce timer only resets on a real change,
  // not on every render (a fresh object identity would re-arm it each render).
  const firstCategoryId = categoryIds[0] ?? null;
  const params = useMemo(
    () => buildPriceSuggestionParams(firstCategoryId != null ? [firstCategoryId] : [], brandId, condition),
    [firstCategoryId, brandId, condition],
  );
  const debouncedParams = useDebouncedValue(params, 400);

  const { data } = useQuery({
    queryKey: queryKeys.products.priceSuggestion(debouncedParams ?? { categoryId: 0 }),
    queryFn: () => api.products.getPriceSuggestion(debouncedParams ?? { categoryId: 0 }),
    enabled: debouncedParams !== null,
    staleTime: 1000 * 60 * 5,
  });

  return priceSuggestionView(data);
}
