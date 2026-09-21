/**
 * Pure helpers for the seller CSV export (EXPORT-CSV-01, handoff 2026-09-16).
 * Kept out of the hook/component so the range rules, the filename and the error
 * mapping can be unit-tested without a network or a DOM.
 *
 * Backend contract (`GET /api/order/seller/export?from=&to=[&status=]`):
 * `JwtAuthGuard` only and scoped to the cookie's user, so a seller can never
 * export someone else's orders. Both dates are required calendar days
 * (`YYYY-MM-DD`) and the range is inclusive on both ends. Answers the file
 * itself (`text/csv`, UTF-8 BOM, CRLF, 19 columns, one row per order ITEM) —
 * not a JSON envelope. Error legs DO answer JSON: **400** reversed/invalid
 * dates, unknown `status`, window over 90 days, or over 5 000 item rows;
 * **401** not logged in.
 */

import { rangePresetDates, toIsoDate } from './analytics/analyticsRange';

/** Backend cap on the export window, in inclusive calendar days. */
export const EXPORT_MAX_DAYS = 90;

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
 * backend's 400 rules so the seller is told before a download is attempted —
 * the request still goes out on anything this misses, and the server's message
 * wins (it is the one that knows the row count).
 */
export function exportRangeError(from: string, to: string): string | null {
  if (!from || !to) return 'Chọn cả ngày bắt đầu và ngày kết thúc.';
  const days = exportRangeDays(from, to);
  if (days === null) return 'Ngày không hợp lệ.';
  if (days < 1) return 'Ngày bắt đầu phải trước ngày kết thúc.';
  if (days > EXPORT_MAX_DAYS) {
    return `Khoảng thời gian tối đa là ${EXPORT_MAX_DAYS} ngày (đang chọn ${days} ngày).`;
  }
  return null;
}

/**
 * Download filename, mirroring the backend `Content-Disposition` value — which
 * only ever uses the first 10 chars of each date, even when a full ISO
 * timestamp was sent.
 */
export function sellerOrderExportFileName(from: string, to: string): string {
  return `trybuy-orders-${from.slice(0, 10)}-${to.slice(0, 10)}.csv`;
}

/**
 * Maps a failed export to a user-facing Vietnamese message. A 400 is surfaced
 * **verbatim** on purpose: it names the real number of rows or days, which is
 * exactly what tells the seller how to narrow the window.
 */
export function sellerOrderExportErrorMessage(error: unknown): string {
  const raw =
    error && typeof error === 'object'
      ? (error as { statusCode?: unknown; message?: unknown })
      : {};
  const statusCode = typeof raw.statusCode === 'number' ? raw.statusCode : 0;
  const message = typeof raw.message === 'string' ? raw.message.trim() : '';

  if (statusCode === 400 && message) return message;
  switch (statusCode) {
    case 400:
      return 'Khoảng thời gian không hợp lệ. Vui lòng chọn lại.';
    case 401:
      return 'Vui lòng đăng nhập để xuất đơn hàng.';
    default:
      return 'Không xuất được file CSV. Vui lòng thử lại.';
  }
}
