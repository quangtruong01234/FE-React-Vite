import { useState, type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Ban, RotateCcw } from 'lucide-react';
import { useReturnRequestQueue, useReviewReturnRequest } from './useReturnRequests';
import { usePageParam } from '@/hooks/ui/usePageParam';
import { useFilterParam } from '@/hooks/ui/useFilterParam';
import { useListSearch, listSearchEmptyText } from '@/hooks/ui/useListSearch';
import { SearchField } from '@/components/shared/SearchField';
import { returnStatusMeta, refundStatusLabel } from './returnRequest';
import { Pagination } from '@/components/shared/Pagination';
import { FetchingOverlay } from '@/components/shared/FetchingOverlay';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatVnd } from '@/lib/format/utils';
import { formatDateTime } from '@/lib/format/time';
import type { ReturnRequest, ReturnRequestStatus } from '@/types';
import { useT } from '@/hooks/ui/useT';
import { useLanguage } from '@/context/useLanguage';
import type { MessageKey } from '@/lib/i18n/messages';
import { orderMessages } from './order.i18n';
import { ReturnPhotoStrip } from './ReturnPhotoStrip';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

type FilterKey = 'all' | ReturnRequestStatus;

const FILTER_OPTS: {
  id: FilterKey;
  labelKey: MessageKey<typeof orderMessages>;
  status?: ReturnRequestStatus;
}[] = [
  { id: 'all',            labelKey: 'filterAll' },
  { id: 'pending_review', labelKey: 'returnPending',  status: 'pending_review' },
  { id: 'approved',       labelKey: 'returnApproved', status: 'approved' },
  { id: 'rejected',       labelKey: 'returnRejected', status: 'rejected' },
];

const FILTER_KEYS: readonly FilterKey[] = FILTER_OPTS.map(o => o.id);

const LIMIT = 10;

function RequestCard({
  request,
  pendingAction,
  onApprove,
  onReject,
}: {
  request: ReturnRequest;
  pendingAction: 'approve' | 'reject' | null;
  onApprove: () => void;
  onReject: (id: string, reason: string) => void;
}): ReactElement {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const t = useT(orderMessages);
  const { lang } = useLanguage();
  const meta = returnStatusMeta(request.status, lang);
  const refundLine = refundStatusLabel(request, lang);
  const busy = pendingAction !== null;

  return (
    <div data-testid={`seller-return-${request.id}`} className="bg-canvas-surface border border-bdr rounded-xl p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <RotateCcw size={15} className="text-accent-amber shrink-0" />
          <Link
            to={`/order/${request.orderId}`}
            className="font-mono font-bold text-[13px] text-ink-pri hover:text-accent-amber transition-colors"
          >
            {t('orderRef', { id: request.orderId })}
          </Link>
          <span className="font-body text-xs text-ink-sec">{formatDateTime(request.createdAt, lang)}</span>
        </div>
        <span className={cn(
          'inline-flex items-center px-2 py-0.5 text-xs font-body font-medium rounded-tb-pill border',
          meta.className,
        )}>
          {meta.label}
        </span>
      </div>

      <p className="m-0 font-body text-sm text-ink-pri">{t('buyerReason', { reason: request.reason })}</p>
      <ReturnPhotoStrip urls={request.imageUrls} className="mt-2" />
      {request.status === 'rejected' && request.rejectReason && (
        <p className="m-0 mt-1.5 font-body text-sm text-accent-red">{t('rejectedReason', { reason: request.rejectReason })}</p>
      )}
      {refundLine && (
        <p className="m-0 mt-1.5 font-body text-sm text-accent-green">
          {refundLine}
          {request.refundAmount != null && ` · ${formatVnd(request.refundAmount, lang)}`}
        </p>
      )}

      {request.status === 'pending_review' && (
        <div className="mt-3 pt-3 border-t border-bdr flex flex-col gap-3">
          {!rejectOpen ? (
            <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                disabled={busy}
                onClick={onApprove}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-tb-cta bg-tb-green/90 text-canvas-base font-body font-semibold text-sm transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed hover:opacity-90"
              >
                <BadgeCheck size={15} className="shrink-0" />
                {pendingAction === 'approve' ? t('approving') : t('approveRefund')}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setRejectOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-tb-input border border-tb-red/30 bg-tb-red/5 text-accent-red font-body font-semibold text-sm cursor-pointer hover:bg-tb-red/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Ban size={15} className="shrink-0" />
                {t('reject')}
              </button>
            </div>
          ) : (
            <>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('rejectReasonPlaceholder')}
                maxLength={1000}
                rows={2}
                className="w-full resize-none rounded-tb-input border border-bdr bg-canvas-base text-ink-pri font-body text-sm px-3 py-2 placeholder:text-ink-muted focus:outline-none focus:border-accent-amber transition-colors"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={busy || !rejectReason.trim()}
                  onClick={() => onReject(request.id, rejectReason.trim())}
                  className="px-4 py-2 rounded-tb-input border border-tb-red/30 bg-tb-red/5 text-accent-red font-body font-semibold text-sm cursor-pointer hover:bg-tb-red/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pendingAction === 'reject' ? t('rejecting') : t('confirmReject')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setRejectOpen(false)}
                  className="px-4 py-2 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-pri font-body font-semibold text-sm cursor-pointer hover:border-accent-amber transition-colors"
                >
                  {t('close')}
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
  const t = useT(orderMessages);
  const { lang } = useLanguage();
  const [filterTab, setFilterTab] = useFilterParam<FilterKey>('status', FILTER_KEYS, 'pending_review');
  const [page, setPage] = usePageParam();
  const search = useListSearch(() => { if (page !== 1) setPage(1); });

  const activeStatus = FILTER_OPTS.find(o => o.id === filterTab)?.status;
  const { data, isLoading, isFetching, error } = useReturnRequestQueue(page, LIMIT, activeStatus, search.term);
  const review = useReviewReturnRequest();
  // Approving refunds the buyer and cannot be undone — ask first (prod route test F30, 2026-10-08).
  const [approveTarget, setApproveTarget] = useState<ReturnRequest | null>(null);

  const requests = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  const errorMsg = error
    ? (typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : t('returnLoadFailed'))
    : null;

  const reviewErrorMsg = review.isError
    ? (typeof review.error === 'object' && review.error !== null && 'message' in review.error
        ? String((review.error as { message: unknown }).message)
        : t('reviewFailed'))
    : null;

  // setFilterTab also drops ?page= in the same URL update (useFilterParam).
  const handleTabChange = (key: FilterKey): void => {
    setFilterTab(key);
  };

  const pendingActionFor = (id: string): 'approve' | 'reject' | null => {
    if (!review.isPending || review.variables?.id !== id) return null;
    return review.variables.action;
  };

  return (
    <div>
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate('/sell/orders')}
          aria-label={t('back')}
          className="bg-canvas-elevated border border-bdr rounded-lg px-3 py-2 text-ink-pri cursor-pointer text-sm hover:border-accent-amber transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={16} className="shrink-0" /> {t('ordersNav')}
        </button>
      </div>

      <h1 className="font-display font-black text-4xl leading-[1.05] tracking-[-0.02em] text-ink-pri m-0 mb-1">
        {t('returnRequests')}
      </h1>
      <p className="font-body text-sm text-ink-sec mt-1 mb-7">
        {t('sellerReturnsSub')}
      </p>

      {errorMsg && (
        <div className="bg-tb-red/10 border border-accent-red text-accent-red px-4 py-3 rounded-xl mb-6 text-sm font-body">
          {errorMsg}
        </div>
      )}
      {reviewErrorMsg && !approveTarget && (
        <div className="bg-tb-red/10 border border-accent-red text-accent-red px-4 py-3 rounded-xl mb-6 text-sm font-body">
          {review.variables ? <span className="font-mono font-bold">#{review.variables.id}</span> : null} · {reviewErrorMsg}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2.5 overflow-x-auto pb-0.5 mb-4">
        {FILTER_OPTS.map(opt => {
          const active = opt.id === filterTab;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleTabChange(opt.id)}
              className={cn(
                'flex-none px-[18px] py-2.5 rounded-full text-ink-pri font-body font-semibold text-[13px] cursor-pointer whitespace-nowrap border',
                active ? 'bg-tb-gradient border-transparent text-ink-on-accent' : 'bg-tb-elevated border-tb-border',
              )}
            >
              {t(opt.labelKey)}
            </button>
          );
        })}
      </div>

      <SearchField
        value={search.input}
        onChange={search.setInput}
        placeholder={t('returnSearchPlaceholder')}
        className="max-w-md mb-6"
      />

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
            {listSearchEmptyText(search, t('nounRequests'), lang)
              ?? (filterTab === 'pending_review' ? t('noPendingReturns') : t('noReturnsInTab'))}
          </p>
        </div>
      )}

      {!isLoading && requests.length > 0 && (
        <FetchingOverlay fetching={isFetching && !isLoading}>
          <div className="flex flex-col gap-3">
            {requests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                pendingAction={pendingActionFor(req.id)}
                onApprove={() => setApproveTarget(req)}
                onReject={(id, reason) => review.mutate({ id, action: 'reject', reason })}
              />
            ))}
          </div>
        </FetchingOverlay>
      )}

      {!isLoading && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-8" />
      )}

      <ConfirmDialog
        open={approveTarget !== null}
        title={t('approveConfirmTitle')}
        description={t('approveConfirmBody', { id: approveTarget?.orderId ?? '' })}
        confirmLabel={t('approveRefund')}
        isPending={review.isPending}
        error={reviewErrorMsg}
        onConfirm={() => {
          if (!approveTarget) return;
          review.mutate(
            { id: approveTarget.id, action: 'approve' },
            { onSuccess: () => setApproveTarget(null) },
          );
        }}
        onCancel={() => {
          setApproveTarget(null);
          review.reset();
        }}
      />
    </div>
  );
}
