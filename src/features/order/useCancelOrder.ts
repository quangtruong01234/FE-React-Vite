import { useMutation } from '@tanstack/react-query';
import { api } from '@/api';
import { invalidateOrderViews } from '@/lib/query/orderInvalidation';
import type { Order } from '@/types';

export function useCancelOrder(meId: string): ReturnType<typeof useMutation<Order, unknown, string>> {
  return useMutation({
    mutationFn: (orderId: string) => api.orders.cancel(orderId),
    onSuccess: (_data, orderId) => {
      invalidateOrderViews({ orderId, buyerId: meId });
    },
    onError: (error: unknown) => {
      console.error('Cancel order failed', error);
    },
  });
}
