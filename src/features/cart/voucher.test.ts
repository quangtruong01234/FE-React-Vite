import { describe, it, expect } from 'vitest';
import {
  normalizeVoucherCode,
  distinctSellerCount,
  discountedGrandTotal,
  voucherErrorMessage,
} from './voucher';

describe('normalizeVoucherCode', () => {
  it('trims and uppercases (codes are case-insensitive server-side)', () => {
    expect(normalizeVoucherCode('  sale10 ')).toBe('SALE10');
    expect(normalizeVoucherCode('')).toBe('');
  });
});

describe('distinctSellerCount', () => {
  it('counts distinct seller ids', () => {
    expect(distinctSellerCount(['usr_1', 'usr_1', 'usr_2'])).toBe(2);
    expect(distinctSellerCount(['usr_7', 'usr_7'])).toBe(1);
    expect(distinctSellerCount([])).toBe(0);
  });

  it('ignores items whose product has not loaded yet', () => {
    expect(distinctSellerCount(['usr_1', undefined, 'usr_1'])).toBe(1);
    expect(distinctSellerCount([undefined])).toBe(0);
  });
});

describe('discountedGrandTotal', () => {
  it('subtracts the discount before adding shipping', () => {
    expect(discountedGrandTotal(200_000, 50_000, 30_000)).toBe(180_000);
    expect(discountedGrandTotal(200_000, 0, 30_000)).toBe(230_000);
  });

  it('never lets the discount push the goods total below zero', () => {
    expect(discountedGrandTotal(40_000, 50_000, 30_000)).toBe(30_000);
  });
});

describe('voucherErrorMessage', () => {
  const err = (statusCode: number, message: string) => ({ statusCode, status: statusCode, message });

  it('maps 404 to unknown/inactive code', () => {
    expect(voucherErrorMessage(err(404, 'Voucher not found'))).toBe(
      'Mã giảm giá không tồn tại hoặc đã bị vô hiệu hóa.',
    );
  });

  it('maps known 400 rejection reasons to Vietnamese', () => {
    expect(voucherErrorMessage(err(400, 'Voucher expired'))).toBe('Mã giảm giá đã hết hạn.');
    expect(voucherErrorMessage(err(400, 'Voucher not started yet'))).toBe(
      'Mã giảm giá chưa đến thời gian áp dụng.',
    );
    expect(voucherErrorMessage(err(400, 'Order below minOrderAmount'))).toBe(
      'Đơn hàng chưa đạt giá trị tối thiểu để dùng mã này.',
    );
    expect(voucherErrorMessage(err(400, 'Per-user limit reached'))).toBe('Bạn đã sử dụng mã này rồi.');
    expect(voucherErrorMessage(err(400, 'Usage limit exhausted'))).toBe(
      'Mã giảm giá đã hết lượt sử dụng.',
    );
    expect(voucherErrorMessage(err(400, 'Voucher not supported on multi-seller orders'))).toBe(
      'Mã giảm giá chỉ áp dụng cho đơn hàng từ một người bán.',
    );
  });

  it('falls back to the server message, then a generic one', () => {
    expect(voucherErrorMessage(err(400, 'Something odd'))).toBe('Something odd');
    expect(voucherErrorMessage(err(500, 'Internal error'))).toBe('Internal error');
    expect(voucherErrorMessage(undefined)).toBe('Không thể áp dụng mã giảm giá. Vui lòng thử lại.');
  });
});
