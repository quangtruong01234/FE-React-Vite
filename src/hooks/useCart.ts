import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from './queryKeys';
import type { AddToCartDto, ServerCart, ServerCartItem, UpdateCartItemDto } from '@/types';

export function useCart() {
  return useQuery<ServerCart | null>({
    queryKey: queryKeys.cart.all,
    queryFn: () => api.cart.get(),
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddToCartDto) => api.cart.addItem(data),
    onMutate: async (data: AddToCartDto) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.all });
      const previous = queryClient.getQueryData<ServerCart | null>(queryKeys.cart.all);
      queryClient.setQueryData<ServerCart | null>(queryKeys.cart.all, old => {
        if (!old) return old;
        const existing = old.items.find(
          i => i.productId === data.productId && i.skuId === (data.skuId ?? null),
        );
        if (existing) {
          return {
            ...old,
            items: old.items.map(i =>
              i === existing ? { ...i, quantity: i.quantity + data.quantity } : i,
            ),
          };
        }
        const optimisticItem: ServerCartItem = {
          id: -Date.now(),
          cartId: old.id,
          productId: data.productId,
          skuId: data.skuId ?? null,
          skuTierIdx: null,
          quantity: data.quantity,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return { ...old, items: [...old.items, optimisticItem] };
      });
      return { previous };
    },
    onError: (_err, _data, ctx) => {
      queryClient.setQueryData(queryKeys.cart.all, ctx?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      api.cart.updateItem(itemId, { quantity } satisfies UpdateCartItemDto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) => api.cart.removeItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.cart.clear(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
}
