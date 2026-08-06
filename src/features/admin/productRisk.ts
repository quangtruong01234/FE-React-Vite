import type { ApiError, ProductRiskFlag, RiskBackfillResult, RiskProduct, RiskScoringStatus } from '@/types';
import { formatVnd } from '@/lib/format/utils';
import { formatDateTime } from '@/lib/format/time';

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
export function riskScoreMeta(score: number): RiskScoreMeta {
  if (score >= 70) {
    return { label: 'Rủi ro cao', className: 'bg-accent-red/10 text-accent-red border-accent-red/20' };
  }
  if (score >= 40) {
    return { label: 'Rủi ro trung bình', className: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20' };
  }
  if (score >= 1) {
    return { label: 'Rủi ro thấp', className: 'bg-canvas-elevated text-ink-sec border-bdr' };
  }
  return { label: 'Không có cờ', className: 'bg-accent-green/10 text-accent-green border-accent-green/20' };
}

/** Human-readable Vietnamese reason for one advisory flag. */
export function riskFlagDescription(flag: ProductRiskFlag): string {
  switch (flag.type) {
    case 'duplicate_image':
      return `Ảnh gần trùng với sản phẩm #${flag.matchedProductId} của seller khác (khoảng cách hash ${flag.hammingDistance})`;
    case 'price_anomaly':
      return `Giá ${formatVnd(flag.productPrice)} thấp bất thường so với trung vị danh mục ${formatVnd(flag.categoryMedian)} (bằng ${Math.round(flag.ratio * 100)}%)`;
    case 'similar_name':
      return `Tên gần trùng với sản phẩm #${flag.matchedProductId} (tương đồng ${Math.round(flag.similarity * 100)}%)`;
  }
}

/** Product id another listing was matched against, when the flag has one. */
export function riskFlagMatchedProductId(flag: ProductRiskFlag): string | null {
  return flag.type === 'price_anomaly' ? null : flag.matchedProductId;
}

export type RiskAction = 'list' | 'rescore' | 'backfill' | 'feedback';

const GENERIC_ACTION_MESSAGE: Record<RiskAction, string> = {
  list: 'Không thể tải hàng đợi rủi ro. Vui lòng thử lại.',
  rescore: 'Không thể chấm điểm lại sản phẩm. Vui lòng thử lại.',
  backfill: 'Không thể xếp hàng chấm điểm sản phẩm cũ. Vui lòng thử lại.',
  feedback: 'Không thể ghi nhận đánh giá kiểm duyệt. Vui lòng thử lại.',
};

/** Friendly message for a failed risk-queue action. */
export function riskErrorMessage(error: unknown, action: RiskAction): string {
  const err = error as Partial<ApiError> | undefined;
  const status = err?.statusCode ?? err?.status;
  if (status === 404) {
    return 'Sản phẩm không còn tồn tại — có thể đã bị xoá. Hãy tải lại danh sách.';
  }
  if (status === 403) {
    return 'Bạn không có quyền xem hàng đợi rủi ro sản phẩm.';
  }
  if (typeof err?.message === 'string' && err.message.trim()) return err.message;
  return GENERIC_ACTION_MESSAGE[action];
}

// --- Durable scoring state (AI-02F1) ---

/** Badge meta for a non-ready scoring state; `null` for `ready` (no badge noise
 *  on the normal case — the score pill already covers it). */
export function riskStatusMeta(status: RiskScoringStatus): RiskScoreMeta | null {
  switch (status) {
    case 'pending':
      return { label: 'Đang chờ chấm điểm', className: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20' };
    case 'failed':
      return { label: 'Chấm điểm lỗi', className: 'bg-accent-red/10 text-accent-red border-accent-red/20' };
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
export function riskRetryDetail(product: RiskRetryFields): string | null {
  if (product.riskScoringStatus === 'ready') return null;
  const parts: string[] = [];
  if (product.riskScoringAttempts > 0) parts.push(`đã thử ${product.riskScoringAttempts} lần`);
  if (product.riskNextRetryAt) {
    const at = formatDateTime(product.riskNextRetryAt);
    if (at) parts.push(`thử lại lúc ${at}`);
  }
  if (product.riskScoringStatus === 'failed' && product.riskLastError) {
    parts.push(`lỗi: ${product.riskLastError}`);
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
export function backfillButtonLabel(state: BackfillState, pending: boolean): string {
  if (pending) return 'Đang xếp hàng...';
  if (!state.started) return 'Chấm điểm sản phẩm cũ';
  if (state.hasMore) return `Tiếp tục backfill (đã xếp ${state.enqueuedTotal})`;
  return `Backfill hoàn tất — đã xếp ${state.enqueuedTotal}`;
}
