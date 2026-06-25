import { useMutation } from '@tanstack/react-query';
import { api } from '@/api';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/hooks/queryKeys';
import type { Order } from '@/types';

export function useConfirmOrder(): ReturnType<typeof useMutation<Order, unknown, number>> {
  return useMutation({
    mutationFn: (orderId: number) => api.orders.confirmOrder(orderId),
    onSuccess: (_data, orderId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.seller });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
    },
    onError: (error: unknown) => {
      console.error('Confirm order failed', error);
    },
  });
}
