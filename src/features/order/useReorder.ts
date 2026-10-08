import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import { findCartLine } from '@/hooks/query/cartCache';
import type { OrderItem, ServerCart } from '@/types';
import { planReorder, reorderAddFailureReason, reorderProductIds, type ReorderSkip } from './reorderItems';

export interface ReorderResult {
  /** Cart line ids the re-added items landed on — preselected on `/cart`. */
  cartLineIds: number[];
  skipped: ReorderSkip[];
}

/**
 * F10 "Mua lại": re-add a past order's still-buyable lines to the cart. Adds
 * run one after another — the first add may create the cart row, and parallel
 * adds would race that creation.
 */
export function useReorder(): ReturnType<typeof useMutation<ReorderResult, unknown, OrderItem[]>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (items: OrderItem[]): Promise<ReorderResult> => {
      const ids = reorderProductIds(items);
      const products = ids.length > 0 ? await api.products.getMultipleWithInventory(ids) : [];
      const { lines, skipped } = planReorder(items, new Map(products.map((p) => [p.id, p])));

      let cart: ServerCart | null = null;
      const added: typeof lines = [];
      for (const line of lines) {
        try {
          cart = await api.cart.addItem(line);
          added.push(line);
        } catch (error: unknown) {
          const item = items.find(
            (i) => i.productId === line.productId && (i.skuId ?? null) === (line.skuId ?? null),
          );
          if (item) skipped.push({ item, reason: reorderAddFailureReason(error) });
        }
      }
      if (cart) queryClient.setQueryData<ServerCart | null>(queryKeys.cart.all, cart);

      const cartLineIds = added.flatMap((line) => {
        const found = findCartLine(cart, line);
        return found ? [found.id] : [];
      });
      return { cartLineIds, skipped };
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
}
