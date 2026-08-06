import { useMutation } from '@tanstack/react-query';
import { api } from '@/api';
import { invalidateOrderViews } from '@/lib/query/orderInvalidation';
import type { Order } from '@/types';

export function useConfirmOrder(): ReturnType<typeof useMutation<Order, unknown, string>> {
  return useMutation({
    mutationFn: (orderId: string) => api.orders.confirmOrder(orderId),
    onSuccess: (_data, orderId) => {
      invalidateOrderViews({ orderId, seller: true });
    },
    onError: (error: unknown) => {
      console.error('Confirm order failed', error);
    },
  });
}
