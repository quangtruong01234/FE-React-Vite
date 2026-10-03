import { useMutation } from '@tanstack/react-query';
import { api } from '@/api';
import { downloadBlob } from '@/lib/file/download';
import { sellerOrderExportFileName } from './sellerOrderExport';
import type { SellerOrderExportParams } from '@/types';

/**
 * EXPORT-CSV-01. A download, not server state — so it is a mutation even though
 * the endpoint is a GET: nothing is cached, and each click tracks its own
 * pending/error state (the 400 leg is the one carrying the "narrow the window"
 * message).
 */
export function useSellerOrderExport(): ReturnType<
  typeof useMutation<void, unknown, SellerOrderExportParams>
> {
  return useMutation({
    mutationFn: async (params: SellerOrderExportParams) => {
      const csv = await api.orders.exportSellerOrders(params);
      downloadBlob(csv, sellerOrderExportFileName(params.from, params.to));
    },
  });
}
