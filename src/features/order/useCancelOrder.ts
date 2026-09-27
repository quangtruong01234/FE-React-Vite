import { useMutation } from '@tanstack/react-query';
import { api } from '@/api';
import { invalidateOrderViews } from '@/lib/query/orderInvalidation';
import type { Order } from '@/types';

export function useCancelOrder(meId: string): ReturnType<typeof useMutation<Order, unknown, string>> {
  return useMutation({
    mutationFn: (orderId: string) => api.orders.cancel(orderId),
    onSuccess: (_data, orderId) => {
      // `vouchers`: BE hands the redemption back on cancel (VOUCHER-CANCEL-01),
      // so a checkout list cached before the cancel would still call it used.
      invalidateOrderViews({ orderId, buyerId: meId, vouchers: true });
    },
    onError: (error: unknown) => {
      console.error('Cancel order failed', error);
    },
  });
}
