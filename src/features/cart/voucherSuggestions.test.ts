import { describe, it, expect } from 'vitest';
import {
  voucherIneligibleMessage,
  voucherScopeLabel,
  voucherSuggestionDiscount,
  sortVoucherSuggestions,
} from './voucherSuggestions';
import type { AvailableVoucher } from '@/types';

const money = (n: number): string => `${n}đ`;

function makeVoucher(overrides: Partial<AvailableVoucher> = {}): AvailableVoucher {
  return {
    code: 'SALE10',
    description: null,
    discountType: 'percent',
    discountValue: '10.00',
    minOrderAmount: '0.00',
    maxDiscountAmount: null,
    sellerId: null,
    scope: 'platform',
    isEligible: true,
    ineligibleReason: null,
    amountToAdd: '0.00',
    discountAmount: '10000.00',
    applicableSubtotal: '100000.00',
    ...overrides,
  };
}

describe('voucherIneligibleMessage', () => {
  it('turns a priced min-order gap into a concrete "buy more" line', () => {
    const message = voucherIneligibleMessage(
      { ineligibleReason: 'MIN_ORDER_NOT_MET', amountToAdd: '20000.00' },
      money,
    );
    expect(message).toBe('Mua thêm 20000đ để dùng mã này.');
  });

  it('falls back to the generic min-order copy when the gap is not priced', () => {
    const message = voucherIneligibleMessage(
      { ineligibleReason: 'MIN_ORDER_NOT_MET', amountToAdd: 0 },
      money,
    );
    expect(message).toBe('Đơn hàng chưa đạt giá trị tối thiểu.');
  });

  it('maps every documented reason to Vietnamese copy', () => {
    expect(
      voucherIneligibleMessage({ ineligibleReason: 'EXPIRED', amountToAdd: 0 }, money),
    ).toBe('Mã đã hết hạn.');
    expect(
      voucherIneligibleMessage({ ineligibleReason: 'WRONG_SELLER', amountToAdd: 0 }, money),
    ).toBe('Chỉ áp dụng cho sản phẩm của người bán khác.');
  });

  it('never leaks a raw enum for an unknown or missing reason', () => {
    expect(
      voucherIneligibleMessage({ ineligibleReason: 'SOMETHING_NEW', amountToAdd: 0 }, money),
    ).toBe('Chưa dùng được cho đơn này.');
    expect(
      voucherIneligibleMessage({ ineligibleReason: null, amountToAdd: 0 }, money),
    ).toBe('Chưa dùng được cho đơn này.');
  });
});

describe('voucherScopeLabel', () => {
  it('distinguishes a shop voucher from a platform one', () => {
    expect(voucherScopeLabel({ scope: 'shop' })).toBe('Của người bán');
    expect(voucherScopeLabel({ scope: 'platform' })).toBe('Toàn sàn');
  });
});

describe('voucherSuggestionDiscount', () => {
  it('reads the DECIMAL string form of the discount', () => {
    expect(voucherSuggestionDiscount({ discountAmount: '12345.00' })).toBe(12345);
    expect(voucherSuggestionDiscount({ discountAmount: 12345 })).toBe(12345);
  });
});

describe('sortVoucherSuggestions', () => {
  it('puts eligible rows first, biggest saving first', () => {
    const sorted = sortVoucherSuggestions([
      makeVoucher({ code: 'SMALL', discountAmount: '5000.00' }),
      makeVoucher({ code: 'DEAD', isEligible: false, ineligibleReason: 'EXPIRED' }),
      makeVoucher({ code: 'BIG', discountAmount: '50000.00' }),
    ]);
    expect(sorted.map((v) => v.code)).toEqual(['BIG', 'SMALL', 'DEAD']);
  });

  it('ranks a near-miss above a dead code, closest gap first', () => {
    const sorted = sortVoucherSuggestions([
      makeVoucher({ code: 'GONE', isEligible: false, ineligibleReason: 'FULLY_REDEEMED' }),
      makeVoucher({
        code: 'FAR',
        isEligible: false,
        ineligibleReason: 'MIN_ORDER_NOT_MET',
        amountToAdd: '90000.00',
      }),
      makeVoucher({
        code: 'NEAR',
        isEligible: false,
        ineligibleReason: 'MIN_ORDER_NOT_MET',
        amountToAdd: '10000.00',
      }),
    ]);
    expect(sorted.map((v) => v.code)).toEqual(['NEAR', 'FAR', 'GONE']);
  });

  it('does not mutate the cached array it was given', () => {
    const input = [
      makeVoucher({ code: 'SMALL', discountAmount: '5000.00' }),
      makeVoucher({ code: 'BIG', discountAmount: '50000.00' }),
    ];
    sortVoucherSuggestions(input);
    expect(input.map((v) => v.code)).toEqual(['SMALL', 'BIG']);
  });
});
