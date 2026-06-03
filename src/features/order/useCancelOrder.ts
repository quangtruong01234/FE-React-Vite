import { useMutation } from '@tanstack/react-query';
import { api } from '@/api';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/hooks/queryKeys';
import type { Order } from '@/types';

export function useCancelOrder(meId: number): ReturnType<typeof useMutation<Order, unknown, number>> {
  return useMutation({
    mutationFn: (orderId: number) => api.orders.cancel(orderId),
    onSuccess: (_data, orderId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.byUser(meId) });
    },
    onError: (error: unknown) => {
      console.error('Cancel order failed', error);
    },
  });
}
