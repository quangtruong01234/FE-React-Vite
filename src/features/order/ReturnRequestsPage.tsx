import { type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useMyReturnRequests } from './useReturnRequests';
import { usePageParam } from '@/hooks/ui/usePageParam';
import { useListSearch, listSearchEmptyText } from '@/hooks/ui/useListSearch';
import { SearchField } from '@/components/shared/SearchField';
import { returnStatusMeta, refundStatusLabel, reviewerLabel } from './returnRequest';
import { Pagination } from '@/components/shared/Pagination';
import { FetchingOverlay } from '@/components/shared/FetchingOverlay';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatVnd } from '@/lib/format/utils';
import { formatDateTime } from '@/lib/format/time';
import { useT } from '@/hooks/ui/useT';
import { useLanguage } from '@/context/useLanguage';
import { orderMessages } from './order.i18n';
import { ReturnPhotoStrip } from './ReturnPhotoStrip';

const LIMIT = 10;

export default function ReturnRequestsPage(): ReactElement {
  const navigate = useNavigate();
  const t = useT(orderMessages);
  const { lang } = useLanguage();
  const [page, setPage] = usePageParam();
  const search = useListSearch(() => { if (page !== 1) setPage(1); });
  const { data, isLoading, isFetching, error } = useMyReturnRequests(page, LIMIT, true, search.term);

  const requests = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  const errorMsg = error
    ? (typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : t('returnLoadFailed'))
    : null;

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate('/orders')}
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
        {t('buyerReturnsSub')}
      </p>

      <SearchField
        value={search.input}
        onChange={search.setInput}
        placeholder={t('returnSearchPlaceholder')}
        className="max-w-md mb-6"
      />

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
          <p className="font-body text-sm text-ink-sec m-0">
            {listSearchEmptyText(search, t('nounRequests'), lang) ?? t('noReturns')}
          </p>
        </div>
      )}

      {!isLoading && requests.length > 0 && (
        <FetchingOverlay fetching={isFetching && !isLoading}>
          <div className="flex flex-col gap-3">
          {requests.map((req) => {
            const meta = returnStatusMeta(req.status, lang);
            const refundLine = refundStatusLabel(req, lang);
            const reviewer = reviewerLabel(req);
            return (
              <div key={req.id} data-testid={`return-request-${req.id}`} className="bg-canvas-surface border border-bdr rounded-xl p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <RotateCcw size={15} className="text-accent-amber shrink-0" />
                    <Link
                      to={`/order/${req.orderId}`}
                      className="font-mono font-bold text-[13px] text-ink-pri hover:text-accent-amber transition-colors"
                    >
                      {t('orderRef', { id: req.orderId })}
                    </Link>
                    <span className="font-body text-xs text-ink-sec">{formatDateTime(req.createdAt, lang)}</span>
                  </div>
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 text-xs font-body font-medium rounded-tb-pill border',
                    meta.className,
                  )}>
                    {meta.label}
                  </span>
                </div>
                <p className="m-0 font-body text-sm text-ink-pri">{t('reason', { reason: req.reason })}</p>
                <ReturnPhotoStrip urls={req.imageUrls} className="mt-2" />
                {req.status === 'rejected' && req.rejectReason && (
                  <p className="m-0 mt-1.5 font-body text-sm text-accent-red">
                    {t('sellerRejected', { reason: req.rejectReason })}
                  </p>
                )}
                {refundLine && (
                  <p className="m-0 mt-1.5 font-body text-sm text-accent-green">
                    {refundLine}
                    {req.refundAmount != null && ` · ${formatVnd(req.refundAmount, lang)}`}
                  </p>
                )}
                {reviewer && (
                  <p className="m-0 mt-1.5 font-body text-xs text-ink-muted">
                    {t('reviewer')} <span className="font-mono">{reviewer}</span>
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
