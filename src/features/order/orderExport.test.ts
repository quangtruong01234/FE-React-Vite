import { describe, it, expect } from 'vitest';
import {
  EXPORT_MAX_DAYS,
  defaultExportRange,
  exportRangeDays,
  exportRangeError,
  sellerOrderExportFileName,
  sellerOrderExportErrorMessage,
} from './sellerOrderExport';

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
});

describe('sellerOrderExportFileName', () => {
  it('mirrors the backend Content-Disposition filename', () => {
    expect(sellerOrderExportFileName('2026-08-19', '2026-09-17')).toBe(
      'trybuy-orders-2026-08-19-2026-09-17.csv',
    );
  });

  it('keeps only the first 10 chars, like the backend does', () => {
    expect(
      sellerOrderExportFileName('2026-08-19T00:00:00.000Z', '2026-09-17T23:59:59.999Z'),
    ).toBe('trybuy-orders-2026-08-19-2026-09-17.csv');
  });
});

describe('sellerOrderExportErrorMessage', () => {
  it('surfaces a 400 message verbatim — it names the real row/day count', () => {
    expect(
      sellerOrderExportErrorMessage({
        statusCode: 400,
        message: 'Export matches 7421 item rows; the maximum is 5000. Narrow the date range.',
      }),
    ).toBe('Export matches 7421 item rows; the maximum is 5000. Narrow the date range.');
  });

  it('falls back to a range hint for a 400 with no message', () => {
    expect(sellerOrderExportErrorMessage({ statusCode: 400 })).toBe(
      'Khoảng thời gian không hợp lệ. Vui lòng chọn lại.',
    );
    expect(sellerOrderExportErrorMessage({ statusCode: 400, message: '   ' })).toBe(
      'Khoảng thời gian không hợp lệ. Vui lòng chọn lại.',
    );
  });

  it('maps 401 to a login prompt', () => {
    expect(sellerOrderExportErrorMessage({ statusCode: 401 })).toBe(
      'Vui lòng đăng nhập để xuất đơn hàng.',
    );
  });

  it('falls back to a generic retry message for unknown / networkless errors', () => {
    expect(sellerOrderExportErrorMessage({ statusCode: 500 })).toBe(
      'Không xuất được file CSV. Vui lòng thử lại.',
    );
    expect(sellerOrderExportErrorMessage(new Error('boom'))).toBe(
      'Không xuất được file CSV. Vui lòng thử lại.',
    );
    expect(sellerOrderExportErrorMessage(undefined)).toBe(
      'Không xuất được file CSV. Vui lòng thử lại.',
    );
  });
});
