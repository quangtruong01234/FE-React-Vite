import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import { downloadBlob } from '@/lib/file/download';
import { exportJobsRefetchInterval, orderExportFileName } from './orderExport';
import type { AdminOrderExportParams, ExportJob, OrderExportScope } from '@/types';

/**
 * EXPORT-CSV-01. A download, not server state — so it is a mutation even though
 * the endpoint is a GET: nothing is cached, and each click tracks its own
 * pending/error state (the 400 leg is the one carrying the "narrow the window"
 * message). `scope` picks the seller route (own orders) or the admin route
 * (whole platform, optional `sellerId`).
 */
export function useOrderExport(
  scope: OrderExportScope,
): ReturnType<typeof useMutation<void, unknown, AdminOrderExportParams>> {
  return useMutation({
    mutationFn: async (params: AdminOrderExportParams) => {
      const csv =
        scope === 'admin'
          ? await api.orders.exportAdminOrders(params)
          : await api.orders.exportSellerOrders({
              from: params.from,
              to: params.to,
              status: params.status,
            });
      downloadBlob(csv, orderExportFileName(scope, params.from, params.to));
    },
  });
}

/**
 * EXPORT-CSV-01 T5 — the caller's export jobs of one scope, newest first. The
 * list polls itself every few seconds only while a job is still pending or
 * running; unmounting the page (or hiding the tab) stops the polling too.
 */
export function useExportJobs(
  scope: OrderExportScope,
): ReturnType<typeof useQuery<ExportJob[], unknown, ExportJob[]>> {
  return useQuery({
    queryKey: queryKeys.orders.exportJobs,
    queryFn: () => api.orders.getExportJobs(),
    // Decided on the raw list, so a job of the other scope (an admin who also
    // used the seller route) still keeps the cache fresh while it runs.
    refetchInterval: query => exportJobsRefetchInterval(query.state.data),
    select: jobs => jobs.filter(job => job.scope === scope),
  });
}

/** Queues a background export; the job list refetches (and starts polling) on success. */
export function useCreateExportJob(
  scope: OrderExportScope,
): ReturnType<typeof useMutation<ExportJob, unknown, AdminOrderExportParams>> {
  const queryClient = useQueryClient();
  return useMutation({
    // The seller job route answers 400 to any unknown body key, `sellerId` included.
    mutationFn: ({ sellerId, ...params }: AdminOrderExportParams) =>
      api.orders.createExportJob(scope, scope === 'admin' ? { ...params, sellerId } : params),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.orders.exportJobs }),
  });
}

/**
 * Downloads a finished job's file. A 409/410 means the list on screen is stale
 * (the job failed or the file expired since the last poll), so it is re-read.
 */
export function useDownloadExportJob(): ReturnType<
  typeof useMutation<void, unknown, ExportJob>
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (job: ExportJob) => {
      const csv = await api.orders.downloadExportJob(job.id);
      downloadBlob(csv, job.fileName ?? orderExportFileName(job.scope, job.from, job.to));
    },
    onError: () => queryClient.invalidateQueries({ queryKey: queryKeys.orders.exportJobs }),
  });
}
