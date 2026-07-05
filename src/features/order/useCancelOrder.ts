import { useMutation } from '@tanstack/react-query';
import { api } from '@/api';
import { invalidateOrderViews } from '@/lib/query/orderInvalidation';
import type { Order } from '@/types';

export function useCancelOrder(meId: number): ReturnType<typeof useMutation<Order, unknown, number>> {
  return useMutation({
    mutationFn: (orderId: number) => api.orders.cancel(orderId),
    onSuccess: (_data, orderId) => {
      invalidateOrderViews({ orderId, buyerId: meId });
    },
    onError: (error: unknown) => {
      console.error('Cancel order failed', error);
    },
  });
}
