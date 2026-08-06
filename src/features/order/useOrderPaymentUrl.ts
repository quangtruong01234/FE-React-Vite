import { useMutation } from '@tanstack/react-query';
import { api } from '@/api';
import { resolvePaymentUrl, redirectToPaymentGateway } from '@/lib/domain/paymentUrl';

export function useOrderPaymentUrl(): ReturnType<typeof useMutation<{ orderUrl: string; status: string | null }, unknown, string>> {
  return useMutation({
    mutationFn: async (orderId: string) => {
      // Poll: the gateway may still be generating the URL right after creation.
      const { orderUrl, status } = await resolvePaymentUrl(() => api.orders.getPaymentUrl(orderId));
      return { orderUrl, status };
    },
    onSuccess: (data) => {
      redirectToPaymentGateway(data.orderUrl);
    },
    onError: (error: unknown) => {
      console.error('Get payment URL failed', error);
    },
  });
}
