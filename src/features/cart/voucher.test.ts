import { describe, it, expect } from 'vitest';
import type { ValidatedVoucher, VoucherValidation } from '@/types';
import {
  normalizeVoucherCode,
  voucherValidateCodes,
  voucherCreateCodes,
  nextVoucherCodes,
  appliedVoucherRows,
  discountedGrandTotal,
  voucherErrorMessage,
} from './voucher';

const shopA: ValidatedVoucher = {
  code: 'SHOPA10',
  scope: 'shop',
  sellerId: 'usr_a',
  discountType: 'fixed',
  discountAmount: 20_000,
};
const platform: ValidatedVoucher = {
  code: 'SALE50',
  scope: 'platform',
  sellerId: null,
  discountType: 'percent',
  discountAmount: 32_900,
};

describe('normalizeVoucherCode', () => {
  it('trims and uppercases (codes are case-insensitive server-side)', () => {
    expect(normalizeVoucherCode('  sale10 ')).toBe('SALE10');
    expect(normalizeVoucherCode('')).toBe('');
  });
});

describe('voucherValidateCodes / voucherCreateCodes', () => {
  it('sends a single code in the legacy field so an older backend still accepts it', () => {
    expect(voucherValidateCodes(['SALE10'])).toEqual({ code: 'SALE10' });
    expect(voucherCreateCodes(['SALE10'])).toEqual({ voucherCode: 'SALE10' });
  });

  it('sends a stack through voucherCodes, in order', () => {
    expect(voucherValidateCodes(['SHOPA10', 'SALE50'])).toEqual({
      voucherCodes: ['SHOPA10', 'SALE50'],
    });
    expect(voucherCreateCodes(['SHOPA10', 'SALE50'])).toEqual({
      voucherCodes: ['SHOPA10', 'SALE50'],
    });
  });

  it('omits every voucher key on create when nothing is applied', () => {
    expect(voucherCreateCodes([])).toEqual({});
  });
});

describe('nextVoucherCodes', () => {
  it('adds a code for a new slot after the applied ones', () => {
    expect(nextVoucherCodes([shopA], 'SALE50', { scope: 'platform', sellerId: null })).toEqual([
      'SHOPA10',
      'SALE50',
    ]);
    expect(nextVoucherCodes([shopA], 'SHOPB5', { scope: 'shop', sellerId: 'usr_b' })).toEqual([
      'SHOPA10',
      'SHOPB5',
    ]);
  });

  it('swaps the platform code instead of stacking a second one', () => {
    expect(
      nextVoucherCodes([shopA, platform], 'FREESHIP', { scope: 'platform', sellerId: null }),
    ).toEqual(['SHOPA10', 'FREESHIP']);
  });

  it("swaps a shop's code instead of stacking a second one from the same shop", () => {
    expect(
      nextVoucherCodes([shopA, platform], 'SHOPA20', { scope: 'shop', sellerId: 'usr_a' }),
    ).toEqual(['SALE50', 'SHOPA20']);
  });

  it('appends a hand-typed code of unknown slot and lets the backend rule', () => {
    expect(nextVoucherCodes([platform], 'MYSTERY')).toEqual(['SALE50', 'MYSTERY']);
  });

  it('is a no-op for a code that is already applied', () => {
    expect(nextVoucherCodes([shopA, platform], 'SALE50')).toEqual(['SHOPA10', 'SALE50']);
  });
});

describe('appliedVoucherRows', () => {
  const base: VoucherValidation = {
    code: 'SHOPA10',
    discountType: 'fixed',
    discountAmount: 52_900,
    itemsTotal: 349_000,
    finalItemsTotal: 296_100,
  };

  it('uses the per-code breakdown when the backend sends it', () => {
    expect(appliedVoucherRows({ ...base, vouchers: [shopA, platform] })).toEqual([shopA, platform]);
  });

  it('falls back to one row of unknown scope on a pre-phase-2 backend', () => {
    expect(appliedVoucherRows(base)).toEqual([
      { code: 'SHOPA10', scope: null, sellerId: null, discountType: 'fixed', discountAmount: 52_900 },
    ]);
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
    expect(voucherErrorMessage(err(404, 'Voucher ZZNOPE not found or inactive'))).toBe(
      'Mã ZZNOPE không tồn tại hoặc đã bị vô hiệu hóa.',
    );
  });

  it('blames the basket, not the code, when a line is deactivated (CHECKOUT-INACTIVE-01)', () => {
    expect(voucherErrorMessage(err(400, 'Product prod_aB12 is not available'))).toBe(
      'Có sản phẩm trong đơn đã ngừng bán. Bỏ sản phẩm đó khỏi đơn rồi thử lại.',
    );
    expect(voucherErrorMessage(err(400, 'Product prod_aB12 is not available'), 'en')).toBe(
      'An item in this order is no longer sold. Remove it and try again.',
    );
  });

  it('maps legacy code-less 400 reasons to Vietnamese', () => {
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

  it('names the failing code from the phase-2 per-code messages', () => {
    expect(voucherErrorMessage(err(400, 'Voucher SALE10 has expired'))).toBe('Mã SALE10 đã hết hạn.');
    expect(voucherErrorMessage(err(400, 'Voucher SALE10 is not active yet'))).toBe(
      'Mã SALE10 chưa đến thời gian áp dụng.',
    );
    expect(
      voucherErrorMessage(err(400, 'Order subtotal must be at least 10000 to use voucher SHOPA10')),
    ).toBe('Đơn hàng chưa đạt giá trị tối thiểu để dùng mã SHOPA10.');
    expect(voucherErrorMessage(err(400, 'Voucher SALE10 has been fully redeemed'))).toBe(
      'Mã SALE10 đã hết lượt sử dụng.',
    );
    expect(
      voucherErrorMessage(err(400, 'You have already used voucher SALE10 the maximum number of times')),
    ).toBe('Bạn đã dùng hết lượt của mã SALE10.');
    expect(voucherErrorMessage(err(400, 'Voucher SALE10 yields no discount'))).toBe(
      'Mã SALE10 không giảm được cho đơn này.',
    );
    expect(voucherErrorMessage(err(409, 'Voucher SALE10 has just been fully redeemed'))).toBe(
      'Mã SALE10 vừa hết lượt sử dụng.',
    );
    expect(
      voucherErrorMessage(err(400, 'Voucher SHOPA10 only applies to items from the shop that issued it')),
    ).toBe('Mã SHOPA10 chỉ áp dụng cho sản phẩm của người bán phát hành mã.');
  });

  it('maps the stacking rules', () => {
    expect(voucherErrorMessage(err(400, 'Only one platform voucher can be applied per checkout'))).toBe(
      'Mỗi đơn chỉ dùng được 1 mã toàn sàn.',
    );
    expect(
      voucherErrorMessage(
        err(
          400,
          'Voucher SHOPA20 is a second voucher from the same shop — only one shop voucher per shop can be applied',
        ),
      ),
    ).toBe('Mỗi người bán chỉ dùng được 1 mã giảm giá.');
  });

  it('does not read keywords out of the code itself', () => {
    // "MINUS10" contains "min"; the real reason is the expiry.
    expect(voucherErrorMessage(err(400, 'Voucher MINUS10 has expired'))).toBe('Mã MINUS10 đã hết hạn.');
  });

  it('falls back to the server message, then a generic one', () => {
    expect(voucherErrorMessage(err(400, 'Something odd'))).toBe('Something odd');
    expect(voucherErrorMessage(err(500, 'Internal error'))).toBe('Internal error');
    expect(voucherErrorMessage(undefined)).toBe('Không thể áp dụng mã giảm giá. Vui lòng thử lại.');
  });
});

describe('voucherErrorMessage — en (I18N-03)', () => {
  const err = (statusCode: number, message: string) => ({ statusCode, status: statusCode, message });

  it('names the code in English', () => {
    expect(voucherErrorMessage(err(404, 'Voucher ZZNOPE not found or inactive'), 'en')).toBe(
      'Voucher ZZNOPE does not exist or has been deactivated.',
    );
    expect(voucherErrorMessage(err(400, 'Voucher SALE10 has expired'), 'en')).toBe('Voucher SALE10 has expired.');
    expect(voucherErrorMessage(err(400, 'Order total is below the minimum to use voucher SALE10'), 'en')).toBe(
      'Your order has not reached the minimum value for voucher SALE10.',
    );
  });

  it('keeps the code-less wording generic', () => {
    expect(voucherErrorMessage(err(400, 'Voucher expired'), 'en')).toBe('This voucher has expired.');
    expect(voucherErrorMessage(err(400, 'Per-user limit reached'), 'en')).toBe('You have already used this voucher.');
    expect(voucherErrorMessage(err(400, 'Only one platform voucher per order'), 'en')).toBe(
      'Only one platform-wide voucher can be used per order.',
    );
  });

  it('falls back to English when the server says nothing', () => {
    expect(voucherErrorMessage(err(500, ''), 'en')).toBe('Could not apply the voucher. Please try again.');
  });
});
