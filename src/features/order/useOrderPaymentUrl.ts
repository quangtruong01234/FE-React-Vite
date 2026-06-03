import { useMutation } from '@tanstack/react-query';
import { api } from '@/api';

export function useOrderPaymentUrl(): ReturnType<typeof useMutation<{ order_url: string; status: string }, unknown, number>> {
  return useMutation({
    mutationFn: (orderId: number) => api.orders.getPaymentUrl(orderId),
    onSuccess: (data) => {
      window.location.href = data.order_url;
    },
    onError: (error: unknown) => {
      console.error('Get payment URL failed', error);
    },
  });
}
