import { useMutation } from '@tanstack/react-query';
import { api } from '@/api';
import { downloadBlob } from '@/lib/file/download';
import { invoiceFileName } from './orderInvoice';

export function useOrderInvoice(): ReturnType<typeof useMutation<void, unknown, string>> {
  return useMutation({
    mutationFn: async (orderId: string) => {
      const blob = await api.orders.getInvoice(orderId);
      downloadBlob(blob, invoiceFileName(orderId));
    },
  });
}
