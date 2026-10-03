import type { ApiError, ProductRiskFlag, RiskBackfillResult, RiskProduct, RiskScoringStatus } from '@/types';
import { formatVnd } from '@/lib/format/utils';
import { formatDateTime } from '@/lib/format/time';
import type { Lang } from '@/lib/i18n/lang';
import { bindTranslator } from '@/lib/i18n/messages';
import { productRiskMessages, type ProductRiskMessageKey } from './productRisk.i18n';

/**
 * Pure helpers for the admin product-risk queue (AI-02).
 *
 * Backend contract: `GET /products/admin/risk` returns products sorted by
 * `riskScore DESC` with advisory `riskFlags[]`; `POST /products/admin/risk/:id/rescore`
 * recomputes one product. Scores never block or auto-unlist — the queue is a
 * review aid only.
 */

export interface RiskScoreMeta {
  label: string;
  className: string;
}

/** Score tiers are advisory buckets for triage, not enforcement thresholds. */
export function riskScoreMeta(score: number, lang: Lang = 'vi'): RiskScoreMeta {
  const t = bindTranslator(productRiskMessages, lang);
  if (score >= 70) {
    return { label: t('scoreHigh'), className: 'bg-tb-red/10 text-accent-red border-tb-red/20' };
  }
  if (score >= 40) {
    return { label: t('scoreMedium'), className: 'bg-tb-amber/10 text-accent-amber border-tb-amber/20' };
  }
  if (score >= 1) {
    return { label: t('scoreLow'), className: 'bg-canvas-elevated text-ink-sec border-bdr' };
  }
  return { label: t('scoreNone'), className: 'bg-tb-green/10 text-accent-green border-tb-green/20' };
}

/**
 * Human-readable reason for one advisory flag. Money stays `formatVnd` in both
 * languages until number formatting follows the language (I18N-07).
 */
export function riskFlagDescription(flag: ProductRiskFlag, lang: Lang = 'vi'): string {
  const t = bindTranslator(productRiskMessages, lang);
  switch (flag.type) {
    case 'duplicate_image':
      return t('flagDuplicateImage', { id: flag.matchedProductId, distance: flag.hammingDistance });
    case 'price_anomaly':
      return t('flagPriceAnomaly', {
        price: formatVnd(flag.productPrice, lang),
        median: formatVnd(flag.categoryMedian, lang),
        percent: Math.round(flag.ratio * 100),
      });
    case 'similar_name':
      return t('flagSimilarName', { id: flag.matchedProductId, percent: Math.round(flag.similarity * 100) });
  }
}

/** Product id another listing was matched against, when the flag has one. */
export function riskFlagMatchedProductId(flag: ProductRiskFlag): string | null {
  return flag.type === 'price_anomaly' ? null : flag.matchedProductId;
}

export type RiskAction = 'list' | 'rescore' | 'backfill' | 'feedback';

const GENERIC_ACTION_MESSAGE: Record<RiskAction, ProductRiskMessageKey> = {
  list: 'failList',
  rescore: 'failRescore',
  backfill: 'failBackfill',
  feedback: 'failFeedback',
};

/** Friendly message for a failed risk-queue action; a server message passes through untranslated. */
export function riskErrorMessage(error: unknown, action: RiskAction, lang: Lang = 'vi'): string {
  const t = bindTranslator(productRiskMessages, lang);
  const err = error as Partial<ApiError> | undefined;
  const status = err?.statusCode ?? err?.status;
  if (status === 404) return t('errorGone');
  if (status === 403) return t('errorForbidden');
  if (typeof err?.message === 'string' && err.message.trim()) return err.message;
  return t(GENERIC_ACTION_MESSAGE[action]);
}

// --- Durable scoring state (AI-02F1) ---

/** Badge meta for a non-ready scoring state; `null` for `ready` (no badge noise
 *  on the normal case — the score pill already covers it). */
export function riskStatusMeta(status: RiskScoringStatus, lang: Lang = 'vi'): RiskScoreMeta | null {
  const t = bindTranslator(productRiskMessages, lang);
  switch (status) {
    case 'pending':
      return { label: t('statusPending'), className: 'bg-tb-amber/10 text-accent-amber border-tb-amber/20' };
    case 'failed':
      return { label: t('statusFailed'), className: 'bg-tb-red/10 text-accent-red border-tb-red/20' };
    case 'ready':
      return null;
  }
}

type RiskRetryFields = Pick<
  RiskProduct,
  'riskScoringStatus' | 'riskScoringAttempts' | 'riskNextRetryAt' | 'riskLastError'
>;

/** One-line retry/error detail for a pending/failed row; `null` when scored or
 *  there is nothing informative to show. */
export function riskRetryDetail(product: RiskRetryFields, lang: Lang = 'vi'): string | null {
  if (product.riskScoringStatus === 'ready') return null;
  const t = bindTranslator(productRiskMessages, lang);
  const parts: string[] = [];
  if (product.riskScoringAttempts > 0) parts.push(t('retryAttempts', { count: product.riskScoringAttempts }));
  if (product.riskNextRetryAt) {
    const at = formatDateTime(product.riskNextRetryAt, lang);
    if (at) parts.push(t('retryAt', { at }));
  }
  if (product.riskScoringStatus === 'failed' && product.riskLastError) {
    parts.push(t('retryError', { error: product.riskLastError }));
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** True when the row carries a duplicate-image flag — gates the moderator
 *  Confirm/Dismiss feedback controls (AI-02F4). */
export function hasDuplicateImageFlag(flags: ProductRiskFlag[]): boolean {
  return flags.some(flag => flag.type === 'duplicate_image');
}

// --- Resumable backfill progress (AI-02F2) ---

export interface BackfillState {
  /** Cursor to send on the NEXT run — `undefined` starts from the beginning. */
  cursor: number | undefined;
  enqueuedTotal: number;
  hasMore: boolean;
  started: boolean;
}

export const INITIAL_BACKFILL_STATE: BackfillState = {
  cursor: undefined,
  enqueuedTotal: 0,
  hasMore: true,
  started: false,
};

/** Fold one `202` backfill response into the running progress state. */
export function applyBackfillResult(state: BackfillState, result: RiskBackfillResult): BackfillState {
  return {
    cursor: result.nextCursor ?? undefined,
    enqueuedTotal: state.enqueuedTotal + result.enqueued,
    hasMore: result.hasMore,
    started: true,
  };
}

/** Label for the backfill action button across its idle/running/resumable/done states. */
export function backfillButtonLabel(state: BackfillState, pending: boolean, lang: Lang = 'vi'): string {
  const t = bindTranslator(productRiskMessages, lang);
  if (pending) return t('backfillPending');
  if (!state.started) return t('backfillIdle');
  if (state.hasMore) return t('backfillResume', { count: state.enqueuedTotal });
  return t('backfillDone', { count: state.enqueuedTotal });
}
