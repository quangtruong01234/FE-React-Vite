import { describe, it, expect } from 'vitest';
import {
  EXPORT_JOB_MAX_DAYS,
  EXPORT_JOB_POLL_MS,
  EXPORT_MAX_DAYS,
  defaultExportRange,
  exportJobErrorMessage,
  exportJobStatusLabel,
  exportJobsRefetchInterval,
  formatExportDay,
  exportRangeDays,
  exportRangeError,
  isExportJobActive,
  isOverSyncRowCap,
  needsBackgroundExport,
  orderExportFileName,
  orderExportErrorMessage,
} from './orderExport';
import { orderStatusLabel } from '@/lib/domain/orderStatus';

describe('defaultExportRange', () => {
  it('offers the last 30 days, inclusive, ending today', () => {
    expect(defaultExportRange(new Date('2026-09-17T08:00:00Z'))).toEqual({
      from: '2026-08-19',
      to: '2026-09-17',
    });
  });

  it('stays inside the backend 90-day cap', () => {
    const { from, to } = defaultExportRange(new Date('2026-09-17T08:00:00Z'));
    expect(exportRangeError(from, to)).toBeNull();
    expect(exportRangeDays(from, to)).toBeLessThanOrEqual(EXPORT_MAX_DAYS);
  });
});

describe('exportRangeDays', () => {
  it('counts both ends (the backend snaps from/to to the day boundaries)', () => {
    expect(exportRangeDays('2026-09-01', '2026-09-01')).toBe(1);
    expect(exportRangeDays('2026-09-01', '2026-09-07')).toBe(7);
  });

  it('counts across a DST-free month boundary without drifting', () => {
    expect(exportRangeDays('2026-08-31', '2026-09-01')).toBe(2);
  });

  it('is negative-ish (below 1) for a reversed range', () => {
    expect(exportRangeDays('2026-09-07', '2026-09-01')).toBe(-5);
  });

  it('rejects malformed and overflowed days', () => {
    expect(exportRangeDays('2026-9-1', '2026-09-07')).toBeNull();
    expect(exportRangeDays('', '2026-09-07')).toBeNull();
    // `Date.parse` would silently read this as 3 March.
    expect(exportRangeDays('2026-02-31', '2026-03-05')).toBeNull();
  });
});

describe('exportRangeError', () => {
  it('passes a valid window', () => {
    expect(exportRangeError('2026-08-19', '2026-09-17')).toBeNull();
    // Exactly at the cap is still allowed.
    expect(exportRangeError('2026-06-20', '2026-09-17')).toBeNull();
    expect(exportRangeDays('2026-06-20', '2026-09-17')).toBe(EXPORT_MAX_DAYS);
  });

  it('asks for both ends when one is empty', () => {
    expect(exportRangeError('', '2026-09-17')).toBe('Chọn cả ngày bắt đầu và ngày kết thúc.');
    expect(exportRangeError('2026-09-17', '')).toBe('Chọn cả ngày bắt đầu và ngày kết thúc.');
  });

  it('flags an unparseable day', () => {
    expect(exportRangeError('2026-02-31', '2026-03-05')).toBe('Ngày không hợp lệ.');
  });

  it('flags a reversed range', () => {
    expect(exportRangeError('2026-09-07', '2026-09-01')).toBe(
      'Ngày bắt đầu phải trước ngày kết thúc.',
    );
  });

  it('flags a window over the cap and names the real day count', () => {
    expect(exportRangeError('2026-06-19', '2026-09-17')).toBe(
      'Khoảng thời gian tối đa là 90 ngày (đang chọn 91 ngày).',
    );
  });

  it('applies the job cap when asked — 366 days passes, 367 does not', () => {
    expect(exportRangeError('2025-09-17', '2026-09-17', EXPORT_JOB_MAX_DAYS)).toBeNull();
    expect(exportRangeError('2025-09-16', '2026-09-17', EXPORT_JOB_MAX_DAYS)).toBe(
      'Khoảng thời gian tối đa là 366 ngày (đang chọn 367 ngày).',
    );
  });
});

describe('needsBackgroundExport', () => {
  it('is false inside the direct 90-day cap', () => {
    expect(needsBackgroundExport('2026-06-20', '2026-09-17')).toBe(false);
  });

  it('is true from 91 up to 366 days', () => {
    expect(needsBackgroundExport('2026-06-19', '2026-09-17')).toBe(true);
    expect(needsBackgroundExport('2025-09-17', '2026-09-17')).toBe(true);
  });

  it('is false past the job cap and for invalid ranges', () => {
    expect(needsBackgroundExport('2025-09-16', '2026-09-17')).toBe(false);
    expect(needsBackgroundExport('2026-09-17', '2026-06-19')).toBe(false);
    expect(needsBackgroundExport('', '2026-09-17')).toBe(false);
  });
});

describe('orderExportFileName', () => {
  it('mirrors the backend Content-Disposition filename', () => {
    expect(orderExportFileName('seller', '2026-08-19', '2026-09-17')).toBe(
      'trybuy-orders-2026-08-19-2026-09-17.csv',
    );
  });

  it('keeps only the first 10 chars, like the backend does', () => {
    expect(
      orderExportFileName('seller', '2026-08-19T00:00:00.000Z', '2026-09-17T23:59:59.999Z'),
    ).toBe('trybuy-orders-2026-08-19-2026-09-17.csv');
  });

  it('names the admin (whole-platform) file trybuy-orders-all-…', () => {
    expect(orderExportFileName('admin', '2026-08-19', '2026-09-17')).toBe(
      'trybuy-orders-all-2026-08-19-2026-09-17.csv',
    );
  });
});

describe('orderExportErrorMessage', () => {
  it('surfaces a 400 message verbatim — it names the real row/day count', () => {
    expect(
      orderExportErrorMessage({
        statusCode: 400,
        message: 'Export matches 7421 item rows; the maximum is 5000. Narrow the date range.',
      }),
    ).toBe('Export matches 7421 item rows; the maximum is 5000. Narrow the date range.');
  });

  it('falls back to a range hint for a 400 with no message', () => {
    expect(orderExportErrorMessage({ statusCode: 400 })).toBe(
      'Khoảng thời gian không hợp lệ. Vui lòng chọn lại.',
    );
    expect(orderExportErrorMessage({ statusCode: 400, message: '   ' })).toBe(
      'Khoảng thời gian không hợp lệ. Vui lòng chọn lại.',
    );
  });

  it('maps 401 to a login prompt', () => {
    expect(orderExportErrorMessage({ statusCode: 401 })).toBe(
      'Vui lòng đăng nhập để xuất đơn hàng.',
    );
  });

  it('falls back to a generic retry message for unknown / networkless errors', () => {
    expect(orderExportErrorMessage({ statusCode: 500 })).toBe(
      'Không xuất được file CSV. Vui lòng thử lại.',
    );
    expect(orderExportErrorMessage(new Error('boom'))).toBe(
      'Không xuất được file CSV. Vui lòng thử lại.',
    );
    expect(orderExportErrorMessage(undefined)).toBe(
      'Không xuất được file CSV. Vui lòng thử lại.',
    );
  });

  it('maps the admin-only legs: 403 for a shop, 404 for an unknown seller', () => {
    expect(orderExportErrorMessage({ statusCode: 403 })).toBe(
      'Chỉ quản trị viên được xuất đơn hàng toàn sàn.',
    );
    expect(orderExportErrorMessage({ statusCode: 404 })).toBe('Không tìm thấy người bán đã chọn.');
  });
});

describe('isOverSyncRowCap', () => {
  it('spots the row-cap 400 — the one a background job can get past', () => {
    expect(
      isOverSyncRowCap({
        statusCode: 400,
        message: 'Export matches 7421 item rows; the maximum is 5000. Narrow the date range or filter by status.',
      }),
    ).toBe(true);
  });

  it('ignores other 400s and other status codes', () => {
    expect(
      isOverSyncRowCap({
        statusCode: 400,
        message: 'Export window is 120 days; the maximum is 90. Narrow the date range.',
      }),
    ).toBe(false);
    expect(isOverSyncRowCap({ statusCode: 500, message: 'item rows' })).toBe(false);
    expect(isOverSyncRowCap(undefined)).toBe(false);
  });
});

describe('exportJobErrorMessage', () => {
  it('surfaces a 400 verbatim (cap re-checked by the job route)', () => {
    expect(
      exportJobErrorMessage({
        statusCode: 400,
        message: 'Export window is 424 days; the maximum is 366. Narrow the date range.',
      }),
    ).toBe('Export window is 424 days; the maximum is 366. Narrow the date range.');
  });

  it('maps the job-only legs 404 / 409 / 410 / 429', () => {
    expect(exportJobErrorMessage({ statusCode: 404 })).toBe('Không tìm thấy file đã xuất.');
    expect(exportJobErrorMessage({ statusCode: 409 })).toBe('File chưa sẵn sàng để tải.');
    expect(exportJobErrorMessage({ statusCode: 410 })).toBe('File đã hết hạn — hãy tạo lại.');
    expect(exportJobErrorMessage({ statusCode: 429 })).toBe(
      'Đang có 3 file đang tạo — chờ một file xong rồi thử lại.',
    );
  });

  it('shares the 401 / 403 legs with the direct export and falls back generically', () => {
    expect(exportJobErrorMessage({ statusCode: 401 })).toBe('Vui lòng đăng nhập để xuất đơn hàng.');
    expect(exportJobErrorMessage({ statusCode: 403 })).toBe(
      'Chỉ quản trị viên được xuất đơn hàng toàn sàn.',
    );
    expect(exportJobErrorMessage({ statusCode: 500 })).toBe('Không tạo được file. Vui lòng thử lại.');
  });
});

describe('job list labels', () => {
  it('formats a calendar day without a timezone round-trip', () => {
    expect(formatExportDay('2026-09-01')).toBe('01/09/2026');
    expect(formatExportDay('garbage')).toBe('garbage');
  });

  it('labels the status filter, falling back to the raw value', () => {
    expect(exportJobStatusLabel(null)).toBe('Tất cả trạng thái');
    expect(exportJobStatusLabel('completed')).toBe(orderStatusLabel('completed'));
    expect(exportJobStatusLabel('someFutureStatus')).toBe('someFutureStatus');
  });
});

describe('job polling', () => {
  it('treats only pending/running as active', () => {
    expect(isExportJobActive({ state: 'pending' })).toBe(true);
    expect(isExportJobActive({ state: 'running' })).toBe(true);
    expect(isExportJobActive({ state: 'done' })).toBe(false);
    expect(isExportJobActive({ state: 'failed' })).toBe(false);
    expect(isExportJobActive({ state: 'expired' })).toBe(false);
  });

  it('polls while any job is active and stops once every job has settled', () => {
    expect(exportJobsRefetchInterval([{ state: 'done' }, { state: 'running' }])).toBe(
      EXPORT_JOB_POLL_MS,
    );
    expect(exportJobsRefetchInterval([{ state: 'done' }, { state: 'failed' }])).toBe(false);
    expect(exportJobsRefetchInterval([])).toBe(false);
    expect(exportJobsRefetchInterval(undefined)).toBe(false);
  });

  it('polls inside the 3–5s window the handoff asks for', () => {
    expect(EXPORT_JOB_POLL_MS).toBeGreaterThanOrEqual(3000);
    expect(EXPORT_JOB_POLL_MS).toBeLessThanOrEqual(5000);
  });
});

describe('export copy in English', () => {
  it('translates range errors, request errors and status labels', () => {
    expect(exportRangeError('', '2026-09-17', EXPORT_MAX_DAYS, 'en')).toBe(
      'Pick both a start date and an end date.',
    );
    expect(exportRangeError('2026-06-19', '2026-09-17', EXPORT_MAX_DAYS, 'en')).toBe(
      `The longest range is ${EXPORT_MAX_DAYS} days (91 days selected).`,
    );
    expect(orderExportErrorMessage({ statusCode: 404 }, 'en')).toBe("Couldn't find the selected seller.");
    expect(orderExportErrorMessage({ statusCode: 401 }, 'en')).toBe('Please sign in to export orders.');
    expect(exportJobErrorMessage({ statusCode: 410 }, 'en')).toBe('The file has expired — create it again.');
    expect(exportJobErrorMessage({ statusCode: 500 }, 'en')).toBe(
      "Couldn't create the file. Please try again.",
    );
    expect(exportJobStatusLabel(null, 'en')).toBe('All statuses');
    expect(exportJobStatusLabel('completed', 'en')).toBe('Completed');
  });
});

describe('formatExportDay in English (I18N-07)', () => {
  it('orders the day month-first and passes garbage through', () => {
    expect(formatExportDay('2026-09-01', 'en')).toBe('09/01/2026');
    expect(formatExportDay('garbage', 'en')).toBe('garbage');
  });
});
