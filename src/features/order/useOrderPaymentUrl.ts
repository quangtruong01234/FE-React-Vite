import { useMutation } from '@tanstack/react-query';
import { api } from '@/api';
import { resolvePaymentUrl } from '@/lib/paymentUrl';

export function useOrderPaymentUrl(): ReturnType<typeof useMutation<{ orderUrl: string; status: string | null }, Error, number>> {
  return useMutation({
    mutationFn: async (orderId: number) => {
      // Poll: the gateway may still be generating the URL right after creation.
      const { orderUrl, status } = await resolvePaymentUrl(() => api.orders.getPaymentUrl(orderId));
      return { orderUrl, status };
    },
    onSuccess: (data) => {
      window.location.href = data.orderUrl;
    },
    onError: (error: unknown) => {
      console.error('Get payment URL failed', error);
    },
  });
}
