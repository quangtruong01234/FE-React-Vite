import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import type { ProductWithInventory } from '@/types';

/**
 * Enriches a set of product IDs into a `productId → ProductWithInventory` map.
 * Backend order/cart items only carry `productId`, so name/image/price/SKU must
 * be hydrated from the product service. Shares the `cartItems` query cache so
 * cart and order views reuse the same fetched products.
 */
export function useProductsByIds(productIds: string[]): {
  productMap: Map<string, ProductWithInventory>;
  isLoading: boolean;
} {
  const ids = [...new Set(productIds)].sort();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.products.cartItems(ids),
    queryFn: () => api.products.getMultipleWithInventory(ids),
    enabled: ids.length > 0,
  });

  const productMap = new Map<string, ProductWithInventory>();
  data?.forEach((product) => productMap.set(product.id, product));

  return { productMap, isLoading: ids.length > 0 && isLoading };
}
