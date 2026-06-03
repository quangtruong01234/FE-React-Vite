import { useMutation } from '@tanstack/react-query';
import { api } from '@/api';

export function useOrderInvoice(): ReturnType<typeof useMutation<void, unknown, number>> {
  return useMutation({
    mutationFn: async (orderId: number) => {
      const blob = await api.orders.getInvoice(orderId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onError: (error: unknown) => {
      console.error('Download invoice failed', error);
    },
  });
}
