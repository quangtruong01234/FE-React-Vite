import { useMutation } from '@tanstack/react-query';
import { api } from '@/api';
import { invalidateOrderViews } from '@/lib/query/orderInvalidation';
import type { Order } from '@/types';

export function useReadyToShip(): ReturnType<typeof useMutation<Order, unknown, number>> {
  return useMutation({
    mutationFn: (orderId: number) => api.orders.readyToShip(orderId),
    onSuccess: (_data, orderId) => {
      invalidateOrderViews({ orderId, seller: true });
    },
    onError: (error: unknown) => {
      console.error('Ready-to-ship failed', error);
    },
  });
}
