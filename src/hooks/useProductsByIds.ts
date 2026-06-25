import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/queryKeys';
import type { ProductWithInventory } from '@/types';

/**
 * Enriches a set of product IDs into a `productId → ProductWithInventory` map.
 * Backend order/cart items only carry `productId`, so name/image/price/SKU must
 * be hydrated from the product service. Shares the `cartItems` query cache so
 * cart and order views reuse the same fetched products.
 */
export function useProductsByIds(productIds: number[]): {
  productMap: Map<number, ProductWithInventory>;
  isLoading: boolean;
} {
  const ids = [...new Set(productIds)].sort((a, b) => a - b);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.products.cartItems(ids),
    queryFn: () => api.products.getMultipleWithInventory(ids),
    enabled: ids.length > 0,
  });

  const productMap = new Map<number, ProductWithInventory>();
  data?.forEach((p) => productMap.set(Number(p.id), p));

  return { productMap, isLoading: ids.length > 0 && isLoading };
}
