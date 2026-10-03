import { describe, it, expect } from 'vitest';
import { formatVnd } from '@/lib/format/utils';
import {
  riskScoreMeta,
  riskFlagDescription,
  riskFlagMatchedProductId,
  riskErrorMessage,
  riskStatusMeta,
  riskRetryDetail,
  hasDuplicateImageFlag,
  INITIAL_BACKFILL_STATE,
  applyBackfillResult,
  backfillButtonLabel,
} from './productRisk';
import type { ProductRiskFlag } from '@/types';

describe('riskScoreMeta', () => {
  it('buckets scores into high / medium / low / clean tiers', () => {
    expect(riskScoreMeta(85).label).toBe('Rủi ro cao');
    expect(riskScoreMeta(70).label).toBe('Rủi ro cao');
    expect(riskScoreMeta(69).label).toBe('Rủi ro trung bình');
    expect(riskScoreMeta(40).label).toBe('Rủi ro trung bình');
    expect(riskScoreMeta(39).label).toBe('Rủi ro thấp');
    expect(riskScoreMeta(1).label).toBe('Rủi ro thấp');
    expect(riskScoreMeta(0).label).toBe('Không có cờ');
  });

  it('uses red styling for the high tier and green for clean', () => {
    expect(riskScoreMeta(90).className).toContain('accent-red');
    expect(riskScoreMeta(0).className).toContain('accent-green');
  });
});

describe('riskFlagDescription', () => {
  it('describes a duplicate_image flag with the matched product and distance', () => {
    const flag: ProductRiskFlag = { type: 'duplicate_image', weight: 40, matchedProductId: 'prod_0000000000000012', hammingDistance: 3 };
    const desc = riskFlagDescription(flag);
    expect(desc).toContain('#prod_0000000000000012');
    expect(desc).toContain('3');
    expect(desc).toContain('Ảnh');
  });

  it('describes a price_anomaly flag with formatted prices and percent ratio', () => {
    const flag: ProductRiskFlag = {
      type: 'price_anomaly', weight: 30, productPrice: 50000, categoryMedian: 500000, ratio: 0.1,
    };
    const desc = riskFlagDescription(flag);
    expect(desc).toContain(formatVnd(50000));
    expect(desc).toContain(formatVnd(500000));
    expect(desc).toContain('10%');
  });

  it('describes a similar_name flag with the matched product and similarity percent', () => {
    const flag: ProductRiskFlag = { type: 'similar_name', weight: 20, matchedProductId: 'prod_0000000000000007', similarity: 0.925 };
    const desc = riskFlagDescription(flag);
    expect(desc).toContain('#prod_0000000000000007');
    expect(desc).toContain('93%');
  });
});

describe('riskFlagMatchedProductId', () => {
  it('returns the matched id for duplicate_image and similar_name, null for price_anomaly', () => {
    expect(riskFlagMatchedProductId({ type: 'duplicate_image', weight: 40, matchedProductId: 'prod_0000000000000012', hammingDistance: 3 })).toBe('prod_0000000000000012');
    expect(riskFlagMatchedProductId({ type: 'similar_name', weight: 20, matchedProductId: 'prod_0000000000000007', similarity: 0.9 })).toBe('prod_0000000000000007');
    expect(riskFlagMatchedProductId({ type: 'price_anomaly', weight: 30, productPrice: 1, categoryMedian: 2, ratio: 0.5 })).toBeNull();
  });
});

describe('riskErrorMessage', () => {
  it('maps 404 to a product-gone message', () => {
    expect(riskErrorMessage({ statusCode: 404, status: 404, message: 'Not found' }, 'rescore'))
      .toContain('không còn tồn tại');
  });

  it('maps 403 to a permission message', () => {
    expect(riskErrorMessage({ statusCode: 403, status: 403, message: 'Forbidden' }, 'list'))
      .toContain('không có quyền');
  });

  it('falls back to the server message, then a per-action generic message', () => {
    expect(riskErrorMessage({ statusCode: 400, status: 400, message: 'minScore must not be greater than 100' }, 'list'))
      .toBe('minScore must not be greater than 100');
    expect(riskErrorMessage(undefined, 'list')).toContain('Không thể tải');
    expect(riskErrorMessage({ message: '  ' }, 'rescore')).toContain('Không thể chấm điểm lại');
  });

  it('has generic fallbacks for backfill and feedback actions', () => {
    expect(riskErrorMessage(undefined, 'backfill')).toContain('xếp hàng chấm điểm');
    expect(riskErrorMessage(undefined, 'feedback')).toContain('ghi nhận đánh giá');
  });
});

describe('riskStatusMeta', () => {
  it('returns amber badge for pending and red for failed', () => {
    expect(riskStatusMeta('pending')?.label).toBe('Đang chờ chấm điểm');
    expect(riskStatusMeta('pending')?.className).toContain('accent-amber');
    expect(riskStatusMeta('failed')?.label).toBe('Chấm điểm lỗi');
    expect(riskStatusMeta('failed')?.className).toContain('accent-red');
  });

  it('returns null for ready — the score pill covers the normal case', () => {
    expect(riskStatusMeta('ready')).toBeNull();
  });
});

describe('riskRetryDetail', () => {
  it('returns null for ready rows regardless of other fields', () => {
    expect(riskRetryDetail({
      riskScoringStatus: 'ready', riskScoringAttempts: 3, riskNextRetryAt: '2026-07-17T10:00:00Z', riskLastError: 'boom',
    })).toBeNull();
  });

  it('joins attempts, next retry time, and error for a failed row', () => {
    const detail = riskRetryDetail({
      riskScoringStatus: 'failed', riskScoringAttempts: 2, riskNextRetryAt: '2026-07-17T10:00:00Z', riskLastError: 'pHash timeout',
    });
    expect(detail).toContain('đã thử 2 lần');
    expect(detail).toContain('thử lại lúc');
    expect(detail).toContain('lỗi: pHash timeout');
    expect(detail).toContain(' · ');
  });

  it('omits the error part for pending rows and empty fields', () => {
    const detail = riskRetryDetail({
      riskScoringStatus: 'pending', riskScoringAttempts: 1, riskNextRetryAt: null, riskLastError: 'stale error',
    });
    expect(detail).toBe('đã thử 1 lần');
  });

  it('returns null when a pending row has nothing informative', () => {
    expect(riskRetryDetail({
      riskScoringStatus: 'pending', riskScoringAttempts: 0, riskNextRetryAt: null, riskLastError: null,
    })).toBeNull();
  });
});

describe('hasDuplicateImageFlag', () => {
  it('detects a duplicate_image flag among others', () => {
    const flags: ProductRiskFlag[] = [
      { type: 'price_anomaly', weight: 30, productPrice: 1, categoryMedian: 2, ratio: 0.5 },
      { type: 'duplicate_image', weight: 40, matchedProductId: 'prod_0000000000000012', hammingDistance: 3 },
    ];
    expect(hasDuplicateImageFlag(flags)).toBe(true);
  });

  it('returns false without one', () => {
    expect(hasDuplicateImageFlag([
      { type: 'similar_name', weight: 20, matchedProductId: 'prod_0000000000000007', similarity: 0.9 },
    ])).toBe(false);
    expect(hasDuplicateImageFlag([])).toBe(false);
  });
});

describe('backfill progress state', () => {
  it('starts unstarted with no cursor', () => {
    expect(INITIAL_BACKFILL_STATE).toEqual({ cursor: undefined, enqueuedTotal: 0, hasMore: true, started: false });
  });

  it('accumulates enqueued counts and advances the cursor across runs', () => {
    const afterFirst = applyBackfillResult(INITIAL_BACKFILL_STATE, { enqueued: 100, nextCursor: 250, hasMore: true });
    expect(afterFirst).toEqual({ cursor: 250, enqueuedTotal: 100, hasMore: true, started: true });

    const afterSecond = applyBackfillResult(afterFirst, { enqueued: 40, nextCursor: null, hasMore: false });
    expect(afterSecond).toEqual({ cursor: undefined, enqueuedTotal: 140, hasMore: false, started: true });
  });

  it('labels the button across idle / running / resumable / done states', () => {
    expect(backfillButtonLabel(INITIAL_BACKFILL_STATE, false)).toBe('Chấm điểm sản phẩm cũ');
    expect(backfillButtonLabel(INITIAL_BACKFILL_STATE, true)).toBe('Đang xếp hàng...');

    const midway = applyBackfillResult(INITIAL_BACKFILL_STATE, { enqueued: 100, nextCursor: 250, hasMore: true });
    expect(backfillButtonLabel(midway, false)).toBe('Tiếp tục backfill (đã xếp 100)');

    const done = applyBackfillResult(midway, { enqueued: 40, nextCursor: null, hasMore: false });
    expect(backfillButtonLabel(done, false)).toBe('Backfill hoàn tất — đã xếp 140');
  });
});

describe('product-risk copy in English (I18N-06)', () => {
  it('labels score tiers and scoring states', () => {
    expect(riskScoreMeta(85, 'en').label).toBe('High risk');
    expect(riskScoreMeta(40, 'en').label).toBe('Medium risk');
    expect(riskScoreMeta(1, 'en').label).toBe('Low risk');
    expect(riskScoreMeta(0, 'en').label).toBe('No flags');
    expect(riskStatusMeta('pending', 'en')?.label).toBe('Waiting to be scored');
    expect(riskStatusMeta('failed', 'en')?.label).toBe('Scoring failed');
  });

  it('describes each flag type', () => {
    expect(riskFlagDescription(
      { type: 'duplicate_image', weight: 40, matchedProductId: 'prod_0000000000000012', hammingDistance: 3 },
      'en',
    )).toBe('Image nearly matches product #prod_0000000000000012 from another seller (hash distance 3)');
    expect(riskFlagDescription(
      { type: 'similar_name', weight: 20, matchedProductId: 'prod_0000000000000007', similarity: 0.904 },
      'en',
    )).toBe('Name nearly matches product #prod_0000000000000007 (90% similar)');
    const price = riskFlagDescription(
      { type: 'price_anomaly', weight: 30, productPrice: 100000, categoryMedian: 500000, ratio: 0.2 },
      'en',
    );
    expect(price).toContain('unusually low');
    expect(price).toContain('(20% of it)');
  });

  it('pluralises the retry count and keeps the backend error verbatim', () => {
    expect(riskRetryDetail({
      riskScoringStatus: 'pending', riskScoringAttempts: 1, riskNextRetryAt: null, riskLastError: null,
    }, 'en')).toBe('tried 1 time');
    expect(riskRetryDetail({
      riskScoringStatus: 'failed', riskScoringAttempts: 2, riskNextRetryAt: null, riskLastError: 'pHash timeout',
    }, 'en')).toBe('tried 2 times · error: pHash timeout');
  });

  it('translates fallbacks, passes server messages through, and labels the backfill button', () => {
    expect(riskErrorMessage({ statusCode: 403, status: 403 }, 'list', 'en')).toContain('permission');
    expect(riskErrorMessage({ message: 'minScore too big' }, 'list', 'en')).toBe('minScore too big');
    expect(riskErrorMessage(undefined, 'feedback', 'en')).toBe('Could not record the moderation review. Please try again.');

    expect(backfillButtonLabel(INITIAL_BACKFILL_STATE, false, 'en')).toBe('Score older products');
    const midway = applyBackfillResult(INITIAL_BACKFILL_STATE, { enqueued: 100, nextCursor: 250, hasMore: true });
    expect(backfillButtonLabel(midway, false, 'en')).toBe('Continue backfill (100 queued)');
  });
});

describe('riskFlagDescription money in English (I18N-07)', () => {
  it('formats the prices en-US with ₫', () => {
    const flag: ProductRiskFlag = {
      type: 'price_anomaly', weight: 30, productPrice: 50000, categoryMedian: 500000, ratio: 0.1,
    };
    const desc = riskFlagDescription(flag, 'en');
    expect(desc).toContain('50,000 ₫');
    expect(desc).toContain('500,000 ₫');
  });
});
