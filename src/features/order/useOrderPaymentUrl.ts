import { useMutation } from '@tanstack/react-query';
import { api } from '@/api';

export function useOrderPaymentUrl(): ReturnType<typeof useMutation<{ orderUrl: string; status: string | null }, Error, number>> {
  return useMutation({
    mutationFn: async (orderId: number) => {
      const { orderUrl, status } = await api.orders.getPaymentUrl(orderId);
      if (!orderUrl) {
        throw new Error('Không tìm thấy đường dẫn thanh toán cho đơn hàng này.');
      }
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
