import { useMutation } from '@tanstack/react-query';
import { api } from '@/api';
import { invoiceFileName } from './orderInvoice';

export function useOrderInvoice(): ReturnType<typeof useMutation<void, unknown, string>> {
  return useMutation({
    mutationFn: async (orderId: string) => {
      const blob = await api.orders.getInvoice(orderId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = invoiceFileName(orderId);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}
