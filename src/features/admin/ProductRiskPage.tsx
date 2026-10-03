import { useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { RefreshCw, ShieldCheck, ExternalLink, Flag, ListPlus, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/format/utils';
import { formatPrice } from '@/lib/format/utils';
import { productCoverImage } from '@/lib/domain/productImage';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import { ProductThumb } from '@/components/shared/ProductThumb';
import { Pagination } from '@/components/shared/Pagination';
import { FetchingOverlay } from '@/components/shared/FetchingOverlay';
import { usePageParam } from '@/hooks/ui/usePageParam';
import { useFilterParam } from '@/hooks/ui/useFilterParam';
import { useListSearch, listSearchEmptyText } from '@/hooks/ui/useListSearch';
import { useTimedToast } from '@/hooks/ui/useTimedToast';
import { SearchField } from '@/components/shared/SearchField';
import { Skeleton } from '@/components/ui/skeleton';
import {
  riskScoreMeta,
  riskFlagDescription,
  riskFlagMatchedProductId,
  riskErrorMessage,
  riskStatusMeta,
  riskRetryDetail,
  hasDuplicateImageFlag,
  applyBackfillResult,
  backfillButtonLabel,
  INITIAL_BACKFILL_STATE,
} from './productRisk';
import { useT } from '@/hooks/ui/useT';
import { useLanguage } from '@/context/useLanguage';
import { productRiskMessages, type ProductRiskMessageKey } from './productRisk.i18n';
import type { RiskProduct, RiskFeedbackDecision } from '@/types';

// Backend default is minScore=1 (any flag); 0 includes clean/unscored products.
const FILTER_OPTS: { minScore: number; label: ProductRiskMessageKey }[] = [
  { minScore: 1,  label: 'filterFlagged' },
  { minScore: 40, label: 'filterMedium' },
  { minScore: 70, label: 'filterHigh' },
  { minScore: 0,  label: 'filterAll' },
];

// minScore lives in the URL (?minScore=40); keys are the FILTER_OPTS scores as strings.
type MinScoreKey = '1' | '40' | '70' | '0';
const MIN_SCORE_KEYS: readonly MinScoreKey[] = ['1', '40', '70', '0'];

const LIMIT = 20;

function RiskProductCard({
  product,
  rescorePending,
  onRescore,
  feedbackPending,
  onFeedback,
}: {
  product: RiskProduct;
  rescorePending: boolean;
  onRescore: (id: string) => void;
  feedbackPending: boolean;
  onFeedback: (id: string, decision: RiskFeedbackDecision) => void;
}): ReactElement {
  const t = useT(productRiskMessages);
  const { lang } = useLanguage();
  const { riskScore, riskFlags } = product;
  const scoreMeta = riskScoreMeta(riskScore, lang);
  const statusMeta = riskStatusMeta(product.riskScoringStatus, lang);
  const retryDetail = riskRetryDetail(product, lang);
  const canGiveFeedback = hasDuplicateImageFlag(riskFlags);
  const image = productCoverImage(product);

  return (
    <div data-testid={`risk-product-${product.id}`} className="bg-canvas-surface border border-bdr rounded-tb-card p-5">
      {/* Product summary + score */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <ProductThumb
            src={image}
            alt={product.name}
            className="size-14 rounded-tb-input border border-bdr"
            to={`/product/${product.id}`}
          />
          <div className="min-w-0">
            <Link
              to={`/product/${product.id}`}
              className="font-body font-semibold text-sm text-ink-pri hover:text-accent-amber transition-colors line-clamp-1"
            >
              {product.name}
            </Link>
            <div className="flex items-center gap-3 flex-wrap font-body text-xs text-ink-muted mt-0.5">
              <span className="font-mono">{t('productId', { id: product.id })}</span>
              <span>{t('sellerId', { id: product.userId })}{product.user?.name ? ` · ${product.user.name}` : ''}</span>
              <span className="text-accent-amber font-semibold">{formatPrice(product.price, lang)}</span>
              {product.isActive === false && <span className="text-accent-red">{t('hiddenFromStore')}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusMeta && (
            <span className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-body font-semibold rounded-tb-pill border shrink-0',
              statusMeta.className,
            )}>
              {statusMeta.label}
            </span>
          )}
          <span className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-body font-semibold rounded-tb-pill border shrink-0',
            scoreMeta.className,
          )}>
            {scoreMeta.label} · {riskScore}/100
          </span>
        </div>
      </div>

      {/* Pending/failed scoring detail (AI-02F1) — attempts, next retry, last error */}
      {retryDetail && (
        <p className="mt-2 font-body text-xs text-ink-muted m-0">{retryDetail}</p>
      )}

      {/* Flag reasons */}
      {riskFlags.length > 0 && (
        <div className="mt-3 pt-3 border-t border-bdr flex flex-col gap-1.5">
          {riskFlags.map((flag, idx) => {
            const matchedId = riskFlagMatchedProductId(flag);
            return (
              <div key={`${flag.type}-${idx}`} className="flex items-center justify-between gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 font-body text-sm text-ink-sec min-w-0">
                  <Flag size={12} className="shrink-0 text-accent-amber" />
                  {riskFlagDescription(flag, lang)}
                </span>
                {matchedId !== null && (
                  <Link
                    to={`/product/${matchedId}`}
                    className="inline-flex items-center gap-1 font-body text-xs text-ink-muted hover:text-accent-amber transition-colors shrink-0"
                  >
                    <ExternalLink size={12} className="shrink-0" />
                    {t('viewMatched', { id: matchedId })}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Actions — advisory queue: review the product, rescore after edits */}
      <div className="mt-3 pt-3 border-t border-bdr flex gap-2.5 flex-wrap">
        <Link
          to={`/product/${product.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-tb-input text-xs font-body font-semibold bg-canvas-elevated border border-bdr text-ink-sec hover:border-tb-amber/50 hover:text-ink-pri transition-colors"
        >
          <ExternalLink size={14} className="shrink-0" />
          {t('viewProduct')}
        </Link>
        <button
          type="button"
          disabled={rescorePending}
          onClick={() => onRescore(product.id)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-tb-input text-xs font-body font-semibold bg-canvas-elevated border border-bdr text-ink-sec hover:border-tb-amber/50 hover:text-ink-pri transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={14} className={cn('shrink-0', rescorePending && 'animate-spin')} />
          {rescorePending ? t('rescorePending') : t('rescore')}
        </button>
        {/* Duplicate-review feedback (AI-02F4) — audit-only, never unlists */}
        {canGiveFeedback && (
          <>
            <button
              type="button"
              disabled={feedbackPending}
              onClick={() => onFeedback(product.id, 'confirmed_duplicate')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-tb-input text-xs font-body font-semibold bg-canvas-elevated border border-bdr text-accent-red hover:border-tb-red/50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 size={14} className="shrink-0" />
              {t('confirmDuplicate')}
            </button>
            <button
              type="button"
              disabled={feedbackPending}
              onClick={() => onFeedback(product.id, 'dismissed')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-tb-input text-xs font-body font-semibold bg-canvas-elevated border border-bdr text-ink-sec hover:border-tb-amber/50 hover:text-ink-pri transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle size={14} className="shrink-0" />
              {t('dismissWarning')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ProductRiskPage(): ReactElement {
  const queryClient = useQueryClient();
  const t = useT(productRiskMessages);
  const { lang } = useLanguage();
  const [minScoreKey, setMinScoreKey] = useFilterParam<MinScoreKey>('minScore', MIN_SCORE_KEYS, '1');
  const minScore = Number(minScoreKey);
  const [page, setPage] = usePageParam();
  const { toast, showToast } = useTimedToast<string>();
  const search = useListSearch(() => { if (page !== 1) setPage(1); });

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: queryKeys.products.adminRiskList(minScore, page, search.term),
    queryFn: () => api.products.getAdminRisk({ minScore, page, limit: LIMIT, q: search.term }),
    placeholderData: keepPreviousData,
  });

  const rescore = useMutation({
    mutationFn: (id: string) => api.products.rescoreRisk(id),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.adminRisk });
      showToast(t('rescored', { id: result.productId, score: result.riskScore }));
    },
  });

  // Resumable legacy backfill (AI-02F2): each run enqueues one batch and returns
  // the cursor for the next; progress survives re-clicks within the session.
  const [backfillState, setBackfillState] = useState(INITIAL_BACKFILL_STATE);
  const backfill = useMutation({
    mutationFn: () => api.products.backfillRisk(
      backfillState.cursor !== undefined ? { cursor: backfillState.cursor } : {},
    ),
    onSuccess: (result) => {
      setBackfillState(prev => applyBackfillResult(prev, result));
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.adminRisk });
    },
  });
  const backfillDone = backfillState.started && !backfillState.hasMore;

  const feedback = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: RiskFeedbackDecision }) =>
      api.products.sendRiskFeedback(id, { decision }),
    onSuccess: (_result, vars) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.adminRisk });
      showToast(t(vars.decision === 'confirmed_duplicate' ? 'duplicateConfirmed' : 'duplicateDismissed', { id: vars.id }));
    },
  });

  const products = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  const errorMsg = error ? riskErrorMessage(error, 'list', lang) : null;
  const rescoreErrorMsg = rescore.isError ? riskErrorMessage(rescore.error, 'rescore', lang) : null;
  const backfillErrorMsg = backfill.isError ? riskErrorMessage(backfill.error, 'backfill', lang) : null;
  const feedbackErrorMsg = feedback.isError ? riskErrorMessage(feedback.error, 'feedback', lang) : null;

  // setMinScoreKey also drops ?page= in the same URL update (useFilterParam).
  const handleFilterChange = (score: number): void => {
    setMinScoreKey(String(score) as MinScoreKey);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink-pri">{t('title')}</h1>
          <p className="font-body text-sm text-ink-sec mt-1 m-0">{t('intro')}</p>
        </div>
        <button
          type="button"
          disabled={backfill.isPending || backfillDone}
          onClick={() => backfill.mutate()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-tb-input text-xs font-body font-semibold bg-canvas-elevated border border-bdr text-ink-sec hover:border-tb-amber/50 hover:text-ink-pri transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <ListPlus size={14} className="shrink-0" />
          {backfillButtonLabel(backfillState, backfill.isPending, lang)}
        </button>
      </div>

      {toast && (
        <div className="bg-tb-green/15 text-accent-green border border-tb-green/30 rounded-tb-card px-4 py-3 font-body text-sm">
          {toast}
        </div>
      )}
      {errorMsg && (
        <div className="bg-tb-red/10 text-accent-red border border-tb-red/30 rounded-tb-card px-4 py-3 font-body text-sm">
          {errorMsg}
        </div>
      )}
      {rescoreErrorMsg && (
        <div className="bg-tb-red/10 text-accent-red border border-tb-red/30 rounded-tb-card px-4 py-3 font-body text-sm">
          {rescore.variables !== undefined ? <span className="font-mono font-bold">#{rescore.variables}</span> : null} · {rescoreErrorMsg}
        </div>
      )}
      {backfillErrorMsg && (
        <div className="bg-tb-red/10 text-accent-red border border-tb-red/30 rounded-tb-card px-4 py-3 font-body text-sm">
          {backfillErrorMsg}
        </div>
      )}
      {feedbackErrorMsg && (
        <div className="bg-tb-red/10 text-accent-red border border-tb-red/30 rounded-tb-card px-4 py-3 font-body text-sm">
          {feedback.variables !== undefined ? <span className="font-mono font-bold">#{feedback.variables.id}</span> : null} · {feedbackErrorMsg}
        </div>
      )}

      {/* Min-score filter tabs */}
      <div className="flex gap-2.5 overflow-x-auto pb-0.5">
        {FILTER_OPTS.map(opt => {
          const active = opt.minScore === minScore;
          return (
            <button
              key={opt.minScore}
              type="button"
              onClick={() => handleFilterChange(opt.minScore)}
              className={cn(
                'flex-none px-4 py-2 rounded-full font-body font-semibold text-[13px] cursor-pointer whitespace-nowrap border transition-colors',
                active
                  ? 'bg-tb-gradient border-transparent text-ink-on-accent'
                  : 'bg-canvas-elevated border-bdr text-ink-sec hover:text-ink-pri',
              )}
            >
              {t(opt.label)}
            </button>
          );
        })}
      </div>

      <SearchField
        value={search.input}
        onChange={search.setInput}
        placeholder={t('searchPlaceholder')}
        className="max-w-md"
      />

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-40 bg-canvas-elevated rounded-tb-card" />
          ))}
        </div>
      )}

      {!isLoading && !errorMsg && products.length === 0 && (
        <div className="bg-canvas-surface border border-bdr rounded-tb-card py-14 px-6 text-center">
          <span className="flex flex-col items-center gap-2 font-body text-sm text-ink-muted">
            <ShieldCheck size={32} className="shrink-0 opacity-40" />
            {listSearchEmptyText(search, t('searchNoun'), lang)
              ?? (minScore > 0 ? t('emptyFlagged') : t('emptyAll'))}
          </span>
        </div>
      )}

      {!isLoading && products.length > 0 && (
        <FetchingOverlay fetching={isFetching && !isLoading}>
          <div className="flex flex-col gap-3">
            {products.map(product => (
              <RiskProductCard
                key={product.id}
                product={product}
                rescorePending={rescore.isPending && rescore.variables === product.id}
                onRescore={id => rescore.mutate(id)}
                feedbackPending={feedback.isPending && feedback.variables?.id === product.id}
                onFeedback={(id, decision) => feedback.mutate({ id, decision })}
              />
            ))}
          </div>
        </FetchingOverlay>
      )}

      {!isLoading && (
        <Pagination page={page} totalPages={totalPages} hasNext={data?.hasNext} onPageChange={setPage} />
      )}
    </div>
  );
}
