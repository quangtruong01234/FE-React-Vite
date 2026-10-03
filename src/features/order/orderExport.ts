/**
 * Pure helpers for the order CSV export (EXPORT-CSV-01). Kept out of the
 * hooks/components so the range rules, the filename, the error mapping and the
 * job polling rule can be unit-tested without a network or a DOM.
 *
 * Backend contract — two scopes, same file shape:
 * - **seller** `GET /api/order/seller/export?from=&to=[&status=]` (T1–T3):
 *   `JwtAuthGuard` only and scoped to the cookie's user, so a seller can never
 *   export someone else's orders.
 * - **admin** `GET /api/order/admin/export?from=&to=[&status=][&sellerId=]`
 *   (T4): admin only (a shop gets 403); `sellerId` narrows to one seller and an
 *   unknown one is a 404. Same file plus two trailing seller columns.
 *
 * Both dates are required calendar days (`YYYY-MM-DD`), inclusive on both
 * ends. The direct route answers the file itself (`text/csv`, UTF-8 BOM, CRLF,
 * one row per order ITEM) — not a JSON envelope. Its error legs DO answer
 * JSON: **400** reversed/invalid dates, unknown `status`, window over 90 days,
 * or over 5 000 item rows; **401** not logged in.
 *
 * Anything past the direct caps goes through a background job (T5):
 * `POST /api/order/<scope>/export/jobs` → 202, then `GET /order/export/jobs`
 * until the job is `done`, then `GET /order/export/jobs/:id/download`. Jobs
 * allow 366 days / 50 000 rows and three active at a time (429); the file
 * expires 24h after it is built (410).
 */

import { rangePresetDates, toIsoDate } from './analytics/analyticsRange';
import { ORDER_STATUSES, orderStatusLabel } from '@/lib/domain/orderStatus';
import type { Lang } from '@/lib/i18n/lang';
import { bindTranslator, type MessageKey, type Translator } from '@/lib/i18n/messages';
import { orderExportMessages } from './orderExport.i18n';
import type { ExportJob, ExportJobState, OrderExportScope } from '@/types';

/** Backend cap on the direct export window, in inclusive calendar days. */
export const EXPORT_MAX_DAYS = 90;

/** Backend cap on a background export job's window, in inclusive calendar days. */
export const EXPORT_JOB_MAX_DAYS = 366;

/** Backend cap on pending/running jobs per user — the 429 leg. */
export const EXPORT_JOB_MAX_ACTIVE = 3;

/** How often the job list is re-read while a job is still being built (handoff: 3–5s). */
export const EXPORT_JOB_POLL_MS = 4000;

/** Default window offered by the picker — well inside the 90-day cap. */
export const EXPORT_DEFAULT_DAYS = 30;

/**
 * Inclusive `{ from, to }` default for the pickers: the last 30 days ending
 * today. Shares `rangePresetDates` with the analytics range presets so both
 * screens mean the same thing by "30 ngày".
 */
export function defaultExportRange(now: Date = new Date()): {
  from: string;
  to: string;
} {
  return rangePresetDates(EXPORT_DEFAULT_DAYS, now);
}

/** Parses a `YYYY-MM-DD` day to a UTC timestamp, or `null` when unparseable. */
function dayTimestamp(day: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const ms = Date.parse(`${day}T00:00:00.000Z`);
  if (Number.isNaN(ms)) return null;
  // `Date.parse` accepts overflowed days ('2026-02-31' → 3 Mar), which would
  // silently export a different window than the one on screen.
  return toIsoDate(new Date(ms)) === day ? ms : null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Inclusive day count of a range, or `null` when either end is unparseable. */
export function exportRangeDays(from: string, to: string): number | null {
  const fromMs = dayTimestamp(from);
  const toMs = dayTimestamp(to);
  if (fromMs === null || toMs === null) return null;
  return Math.round((toMs - fromMs) / MS_PER_DAY) + 1;
}

/**
 * The reason this range cannot be exported, or `null` when it can. Mirrors the
 * backend's 400 rules so the user is told before a request is attempted — the
 * request still goes out on anything this misses, and the server's message
 * wins (it is the one that knows the row count). `maxDays` is the cap of the
 * route that will be called: 90 for the direct download, 366 for a job.
 */
export function exportRangeError(
  from: string,
  to: string,
  maxDays: number = EXPORT_MAX_DAYS,
  lang: Lang = 'vi',
): string | null {
  const t = bindTranslator(orderExportMessages, lang);
  if (!from || !to) return t('rangeMissing');
  const days = exportRangeDays(from, to);
  if (days === null) return t('rangeInvalid');
  if (days < 1) return t('rangeReversed');
  if (days > maxDays) return t('rangeTooLong', { max: maxDays, days });
  return null;
}

/**
 * True when the range fits a job but is too long for the direct download —
 * the panel then offers "Tạo file trong nền" as its only action.
 */
export function needsBackgroundExport(from: string, to: string): boolean {
  const days = exportRangeDays(from, to);
  return days !== null && days > EXPORT_MAX_DAYS && days <= EXPORT_JOB_MAX_DAYS;
}

/**
 * Download filename, mirroring the backend `Content-Disposition` value — which
 * only ever uses the first 10 chars of each date, even when a full ISO
 * timestamp was sent. The admin file is `trybuy-orders-all-…`.
 */
export function orderExportFileName(
  scope: OrderExportScope,
  from: string,
  to: string,
): string {
  const prefix = scope === 'admin' ? 'trybuy-orders-all' : 'trybuy-orders';
  return `${prefix}-${from.slice(0, 10)}-${to.slice(0, 10)}.csv`;
}

function errorParts(error: unknown): { statusCode: number; message: string } {
  const raw =
    error && typeof error === 'object'
      ? (error as { statusCode?: unknown; message?: unknown })
      : {};
  return {
    statusCode: typeof raw.statusCode === 'number' ? raw.statusCode : 0,
    message: typeof raw.message === 'string' ? raw.message.trim() : '',
  };
}

/** The status-code legs the direct export and the job routes share. */
function sharedExportMessage(
  statusCode: number,
  t: Translator<MessageKey<typeof orderExportMessages>>,
): string | null {
  switch (statusCode) {
    case 400:
      return t('badRange');
    case 401:
      return t('loginRequired');
    case 403:
      return t('adminOnly');
    default:
      return null;
  }
}

/**
 * Maps a failed direct export to a user-facing message. A 400 is
 * surfaced **verbatim** on purpose: it names the real number of rows or days,
 * which is exactly what tells the user how to narrow the window.
 */
export function orderExportErrorMessage(error: unknown, lang: Lang = 'vi'): string {
  const t = bindTranslator(orderExportMessages, lang);
  const { statusCode, message } = errorParts(error);
  if (statusCode === 400 && message) return message;
  // The only 404 on the direct routes is the admin `sellerId` filter.
  if (statusCode === 404) return t('sellerNotFound');
  return sharedExportMessage(statusCode, t) ?? t('exportFailed');
}

/**
 * True when the direct export was refused only for its row count
 * ("Export matches N item rows; the maximum is 5000…") — a refusal a
 * background job (50 000 rows) can still get past, so the panel offers one.
 */
export function isOverSyncRowCap(error: unknown): boolean {
  const { statusCode, message } = errorParts(error);
  return statusCode === 400 && /item rows/i.test(message);
}

/** Maps a failed job request (create or download) to a user-facing message. */
export function exportJobErrorMessage(error: unknown, lang: Lang = 'vi'): string {
  const t = bindTranslator(orderExportMessages, lang);
  const { statusCode, message } = errorParts(error);
  if (statusCode === 400 && message) return message;
  switch (statusCode) {
    case 404:
      return t('fileNotFound');
    case 409:
      return t('fileNotReady');
    case 410:
      return t('fileExpired');
    case 429:
      return t('tooManyJobs', { max: EXPORT_JOB_MAX_ACTIVE });
    default:
      return sharedExportMessage(statusCode, t) ?? t('jobFailed');
  }
}

/** A job the worker has not finished yet — the only state worth polling for. */
export function isExportJobActive(job: Pick<ExportJob, 'state'>): boolean {
  return job.state === 'pending' || job.state === 'running';
}

/**
 * `refetchInterval` for the job list: poll only while some job is still being
 * built, and stop as soon as every job has settled (done / failed / expired).
 */
export function exportJobsRefetchInterval(
  jobs: readonly Pick<ExportJob, 'state'>[] | undefined,
): number | false {
  return jobs?.some(isExportJobActive) ? EXPORT_JOB_POLL_MS : false;
}

/**
 * `YYYY-MM-DD` → `DD/MM/YYYY` (vi) or `MM/DD/YYYY` (en) by string, not through
 * `Date`: a job's range is a pair of calendar days, and a `Date` round-trip would
 * shift it a day for a viewer west of UTC.
 */
export function formatExportDay(day: string, lang: Lang = 'vi'): string {
  const [y, m, d] = day.slice(0, 10).split('-');
  if (!(y && m && d)) return day;
  return lang === 'en' ? `${m}/${d}/${y}` : `${d}/${m}/${y}`;
}

/**
 * Label for a job's `statusFilter`: the order-status label, "Tất cả trạng thái"
 * for `null`, or the raw value for a status this build does not know.
 */
export function exportJobStatusLabel(statusFilter: string | null, lang: Lang = 'vi'): string {
  if (statusFilter === null) return bindTranslator(orderExportMessages, lang)('allStatuses');
  const status = ORDER_STATUSES.find(s => s === statusFilter);
  return status ? orderStatusLabel(status, lang) : statusFilter;
}

/** `labelKey` is an `orderExportMessages` key — render it through the export book's `t`. */
export const EXPORT_JOB_STATE_META: Record<
  ExportJobState,
  { labelKey: MessageKey<typeof orderExportMessages>; badgeClass: string }
> = {
  pending: { labelKey: 'statePending', badgeClass: 'bg-tb-amber/10 text-accent-amber border-tb-amber/20' },
  running: { labelKey: 'stateRunning', badgeClass: 'bg-tb-cyan/10 text-accent-cyan border-tb-cyan/20' },
  done: { labelKey: 'stateDone', badgeClass: 'bg-tb-green/10 text-accent-green border-tb-green/20' },
  failed: { labelKey: 'stateFailed', badgeClass: 'bg-tb-red/10 text-accent-red border-tb-red/20' },
  expired: { labelKey: 'stateExpired', badgeClass: 'bg-canvas-elevated text-ink-muted border-bdr' },
};
