import { type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useMyReturnRequests } from './useReturnRequests';
import { usePageParam } from '@/hooks/ui/usePageParam';
import { returnStatusMeta, refundStatusLabel } from './returnRequest';
import { Pagination } from '@/components/shared/Pagination';
import { FetchingOverlay } from '@/components/shared/FetchingOverlay';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatVnd } from '@/lib/format/utils';
import { formatDateTime } from '@/lib/format/time';

const LIMIT = 10;

export default function ReturnRequestsPage(): ReactElement {
  const navigate = useNavigate();
  const [page, setPage] = usePageParam();
  const { data, isLoading, isFetching, error } = useMyReturnRequests(page, LIMIT);

  const requests = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  const errorMsg = error
    ? (typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Lỗi tải yêu cầu trả hàng')
    : null;

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate('/orders')}
          aria-label="Quay lại"
          className="bg-canvas-elevated border border-bdr rounded-lg px-3 py-2 text-ink-pri cursor-pointer text-sm hover:border-accent-amber transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={16} className="shrink-0" /> Đơn hàng
        </button>
      </div>

      <h1 className="font-display font-black text-[36px] leading-[1.05] tracking-[-0.02em] text-ink-pri m-0 mb-1">
        Yêu cầu trả hàng
      </h1>
      <p className="font-body text-sm text-ink-sec mt-1 mb-7">
        Theo dõi các yêu cầu trả hàng / hoàn tiền của bạn
      </p>

      {errorMsg && (
        <div className="bg-tb-red/10 border border-accent-red text-accent-red px-4 py-3 rounded-xl mb-6 text-sm font-body">
          {errorMsg}
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 bg-canvas-elevated rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && !errorMsg && requests.length === 0 && (
        <div className="bg-canvas-surface border border-bdr rounded-xl py-[60px] px-6 text-center">
          <p className="font-body text-sm text-ink-sec m-0">Bạn chưa có yêu cầu trả hàng nào</p>
        </div>
      )}

      {!isLoading && requests.length > 0 && (
        <FetchingOverlay fetching={isFetching && !isLoading}>
          <div className="flex flex-col gap-3">
          {requests.map((req) => {
            const meta = returnStatusMeta(req.status);
            const refundLine = refundStatusLabel(req);
            return (
              <div key={req.id} className="bg-canvas-surface border border-bdr rounded-xl p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <RotateCcw size={15} className="text-accent-amber shrink-0" />
                    <Link
                      to={`/order/${req.orderId}`}
                      className="font-mono font-bold text-[13px] text-ink-pri hover:text-accent-amber transition-colors"
                    >
                      Đơn #{req.orderId}
                    </Link>
                    <span className="font-body text-xs text-ink-sec">{formatDateTime(req.createdAt)}</span>
                  </div>
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 text-xs font-body font-medium rounded-tb-pill border',
                    meta.className,
                  )}>
                    {meta.label}
                  </span>
                </div>
                <p className="m-0 font-body text-sm text-ink-pri">Lý do: {req.reason}</p>
                {req.status === 'rejected' && req.rejectReason && (
                  <p className="m-0 mt-1.5 font-body text-sm text-accent-red">
                    Người bán từ chối: {req.rejectReason}
                  </p>
                )}
                {refundLine && (
                  <p className="m-0 mt-1.5 font-body text-sm text-accent-green">
                    {refundLine}
                    {req.refundAmount != null && ` · ${formatVnd(req.refundAmount)}`}
                  </p>
                )}
              </div>
            );
          })}
          </div>
        </FetchingOverlay>
      )}

      {!isLoading && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-8" />
      )}
    </div>
  );
}
