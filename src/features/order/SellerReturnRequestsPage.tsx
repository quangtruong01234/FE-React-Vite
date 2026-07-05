import { useState, type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Ban, RotateCcw } from 'lucide-react';
import { useReturnRequestQueue, useReviewReturnRequest } from './useReturnRequests';
import { returnStatusMeta, refundStatusLabel } from './returnRequest';
import { Pagination } from '@/components/shared/Pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatVnd } from '@/lib/format/utils';
import { formatDateTime } from '@/lib/format/time';
import type { ReturnRequest, ReturnRequestStatus } from '@/types';

type FilterKey = 'all' | ReturnRequestStatus;

const FILTER_OPTS: { id: FilterKey; label: string; status?: ReturnRequestStatus }[] = [
  { id: 'all',            label: 'Tất cả' },
  { id: 'pending_review', label: 'Chờ duyệt', status: 'pending_review' },
  { id: 'approved',       label: 'Đã duyệt',  status: 'approved' },
  { id: 'rejected',       label: 'Từ chối',   status: 'rejected' },
];

const LIMIT = 10;

function RequestCard({
  request,
  pendingAction,
  onApprove,
  onReject,
}: {
  request: ReturnRequest;
  pendingAction: 'approve' | 'reject' | null;
  onApprove: (id: number) => void;
  onReject: (id: number, reason: string) => void;
}): ReactElement {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const meta = returnStatusMeta(request.status);
  const refundLine = refundStatusLabel(request);
  const busy = pendingAction !== null;

  return (
    <div className="bg-canvas-surface border border-bdr rounded-xl p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <RotateCcw size={15} className="text-accent-amber shrink-0" />
          <Link
            to={`/order/${request.orderId}`}
            className="font-mono font-bold text-[13px] text-white hover:text-accent-amber transition-colors"
          >
            Đơn #{request.orderId}
          </Link>
          <span className="font-body text-xs text-ink-sec">{formatDateTime(request.createdAt)}</span>
        </div>
        <span className={cn(
          'inline-flex items-center px-2 py-0.5 text-xs font-body font-medium rounded-tb-pill border',
          meta.className,
        )}>
          {meta.label}
        </span>
      </div>

      <p className="m-0 font-body text-sm text-ink-pri">Lý do người mua: {request.reason}</p>
      {request.status === 'rejected' && request.rejectReason && (
        <p className="m-0 mt-1.5 font-body text-sm text-accent-red">Đã từ chối: {request.rejectReason}</p>
      )}
      {refundLine && (
        <p className="m-0 mt-1.5 font-body text-sm text-accent-green">
          {refundLine}
          {request.refundAmount != null && ` · ${formatVnd(Number(request.refundAmount))}`}
        </p>
      )}

      {request.status === 'pending_review' && (
        <div className="mt-3 pt-3 border-t border-bdr flex flex-col gap-3">
          {!rejectOpen ? (
            <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                disabled={busy}
                onClick={() => onApprove(request.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-tb-cta bg-accent-green/90 text-canvas-base font-body font-semibold text-sm transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed hover:opacity-90"
              >
                <BadgeCheck size={15} className="shrink-0" />
                {pendingAction === 'approve' ? 'Đang duyệt...' : 'Duyệt & hoàn tiền'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setRejectOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-tb-input border border-red-500/30 bg-red-500/5 text-red-300 font-body font-semibold text-sm cursor-pointer hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Ban size={15} className="shrink-0" />
                Từ chối
              </button>
            </div>
          ) : (
            <>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Lý do từ chối (bắt buộc)"
                maxLength={1000}
                rows={2}
                className="w-full resize-none rounded-tb-input border border-bdr bg-canvas-base text-ink-pri font-body text-sm px-3 py-2 placeholder:text-ink-muted focus:outline-none focus:border-accent-amber transition-colors"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={busy || !rejectReason.trim()}
                  onClick={() => onReject(request.id, rejectReason.trim())}
                  className="px-4 py-2 rounded-tb-input border border-red-500/30 bg-red-500/5 text-red-300 font-body font-semibold text-sm cursor-pointer hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pendingAction === 'reject' ? 'Đang từ chối...' : 'Xác nhận từ chối'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setRejectOpen(false)}
                  className="px-4 py-2 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-pri font-body font-semibold text-sm cursor-pointer hover:border-accent-amber transition-colors"
                >
                  Đóng
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function SellerReturnRequestsPage(): ReactElement {
  const navigate = useNavigate();
  const [filterTab, setFilterTab] = useState<FilterKey>('pending_review');
  const [page, setPage] = useState(1);

  const activeStatus = FILTER_OPTS.find(o => o.id === filterTab)?.status;
  const { data, isLoading, error } = useReturnRequestQueue(page, LIMIT, activeStatus);
  const review = useReviewReturnRequest();

  const requests = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  const errorMsg = error
    ? (typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Lỗi tải yêu cầu trả hàng')
    : null;

  const reviewErrorMsg = review.isError
    ? (typeof review.error === 'object' && review.error !== null && 'message' in review.error
        ? String((review.error as { message: unknown }).message)
        : 'Không thể xử lý yêu cầu. Vui lòng thử lại.')
    : null;

  const handleTabChange = (key: FilterKey): void => {
    setFilterTab(key);
    setPage(1);
  };

  const pendingActionFor = (id: number): 'approve' | 'reject' | null => {
    if (!review.isPending || review.variables?.id !== id) return null;
    return review.variables.action;
  };

  return (
    <div>
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate('/sell/orders')}
          aria-label="Quay lại"
          className="bg-canvas-elevated border border-bdr rounded-lg px-3 py-2 text-ink-pri cursor-pointer text-sm hover:border-accent-amber transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={16} className="shrink-0" /> Đơn hàng
        </button>
      </div>

      <h1 className="font-display font-black text-[36px] leading-[1.05] tracking-[-0.02em] text-white m-0 mb-1">
        Yêu cầu trả hàng
      </h1>
      <p className="font-body text-sm text-ink-sec mt-1 mb-7">
        Duyệt hoặc từ chối yêu cầu trả hàng / hoàn tiền từ người mua
      </p>

      {errorMsg && (
        <div className="bg-red-950/30 border border-accent-red text-accent-red px-4 py-3 rounded-xl mb-6 text-sm font-body">
          {errorMsg}
        </div>
      )}
      {reviewErrorMsg && (
        <div className="bg-red-950/30 border border-accent-red text-accent-red px-4 py-3 rounded-xl mb-6 text-sm font-body">
          {review.variables ? <span className="font-mono font-bold">#{review.variables.id}</span> : null} · {reviewErrorMsg}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-[10px] overflow-x-auto pb-[2px] mb-6">
        {FILTER_OPTS.map(opt => {
          const active = opt.id === filterTab;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleTabChange(opt.id)}
              className={cn(
                'flex-none px-[18px] py-[10px] rounded-full text-white font-body font-semibold text-[13px] cursor-pointer whitespace-nowrap border',
                active ? 'bg-tb-gradient border-transparent' : 'bg-tb-elevated border-tb-border',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 bg-canvas-elevated rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && !errorMsg && requests.length === 0 && (
        <div className="bg-canvas-surface border border-bdr rounded-xl py-[60px] px-6 text-center">
          <p className="font-body text-sm text-ink-sec m-0">
            {filterTab === 'pending_review' ? 'Không có yêu cầu nào chờ duyệt' : 'Không có yêu cầu nào trong mục này'}
          </p>
        </div>
      )}

      {!isLoading && requests.length > 0 && (
        <div className="flex flex-col gap-3">
          {requests.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              pendingAction={pendingActionFor(req.id)}
              onApprove={(id) => review.mutate({ id, action: 'approve' })}
              onReject={(id, reason) => review.mutate({ id, action: 'reject', reason })}
            />
          ))}
        </div>
      )}

      {!isLoading && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-8" />
      )}
    </div>
  );
}
