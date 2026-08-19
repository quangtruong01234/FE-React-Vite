import { describe, it, expect } from 'vitest';
import {
  toVoucherNumber,
  voucherStatusMeta,
  voucherDiscountLabel,
  voucherUsageLabel,
  voucherWindowLabel,
  canDeactivateVoucher,
  voucherAdminErrorMessage,
  localInputToIso,
  optionalNumber,
  buildCreateVoucherDto,
} from './voucherAdmin';
import { voucherFormSchema, VOUCHER_FORM_DEFAULTS } from './voucherAdmin.schema';
import type { Voucher } from '@/types';

const NOW = new Date('2026-08-18T10:00:00.000Z').getTime();

function makeVoucher(overrides: Partial<Voucher> = {}): Voucher {
  return {
    id: 1,
    code: 'SALE10',
    description: null,
    discountType: 'percent',
    discountValue: '10.00',
    minOrderAmount: '0.00',
    maxDiscountAmount: null,
    usageLimit: null,
    usedCount: 0,
    perUserLimit: null,
    startsAt: null,
    expiresAt: null,
    isActive: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('toVoucherNumber', () => {
  it('accepts both the decimal-string and the number form of a money column', () => {
    expect(toVoucherNumber('50000.00')).toBe(50000);
    expect(toVoucherNumber(50000)).toBe(50000);
  });

  it('falls back to 0 for null, undefined and unparseable values', () => {
    expect(toVoucherNumber(null)).toBe(0);
    expect(toVoucherNumber(undefined)).toBe(0);
    expect(toVoucherNumber('abc')).toBe(0);
  });
});

describe('voucherStatusMeta', () => {
  it('reports a deactivated code as off even when it is also expired', () => {
    const status = voucherStatusMeta(
      makeVoucher({ isActive: false, expiresAt: '2026-08-01T00:00:00.000Z' }),
      NOW,
    );
    expect(status.kind).toBe('inactive');
  });

  it('flags an expired window', () => {
    expect(voucherStatusMeta(makeVoucher({ expiresAt: '2026-08-17T00:00:00.000Z' }), NOW).kind)
      .toBe('expired');
  });

  it('flags a code that hit its total usage limit', () => {
    expect(voucherStatusMeta(makeVoucher({ usageLimit: 5, usedCount: 5 }), NOW).kind)
      .toBe('used_up');
  });

  it('treats a null usage limit as unlimited, never as zero', () => {
    expect(voucherStatusMeta(makeVoucher({ usageLimit: null, usedCount: 999 }), NOW).kind)
      .toBe('active');
  });

  it('flags a window that has not opened yet', () => {
    expect(voucherStatusMeta(makeVoucher({ startsAt: '2026-08-19T00:00:00.000Z' }), NOW).kind)
      .toBe('scheduled');
  });

  it('is active inside an open window', () => {
    const status = voucherStatusMeta(
      makeVoucher({ startsAt: '2026-08-01T00:00:00.000Z', expiresAt: '2026-09-01T00:00:00.000Z' }),
      NOW,
    );
    expect(status.kind).toBe('active');
  });
});

describe('voucherDiscountLabel', () => {
  const money = (n: number): string => `${n}đ`;

  it('renders a percent voucher without a cap', () => {
    expect(voucherDiscountLabel(makeVoucher(), money)).toBe('10%');
  });

  it('appends the cap when a percent voucher has one', () => {
    expect(voucherDiscountLabel(makeVoucher({ maxDiscountAmount: '50000.00' }), money))
      .toBe('10% (tối đa 50000đ)');
  });

  it('renders a fixed voucher as money and ignores any cap', () => {
    const voucher = makeVoucher({
      discountType: 'fixed',
      discountValue: '50000.00',
      maxDiscountAmount: '99999.00',
    });
    expect(voucherDiscountLabel(voucher, money)).toBe('50000đ');
  });
});

describe('voucherUsageLabel', () => {
  it('shows the limit when there is one', () => {
    expect(voucherUsageLabel(makeVoucher({ usedCount: 3, usageLimit: 100 }))).toBe('3 / 100');
  });

  it('shows infinity for an unlimited voucher', () => {
    expect(voucherUsageLabel(makeVoucher({ usedCount: 3, usageLimit: null }))).toBe('3 / ∞');
  });
});

describe('voucherWindowLabel', () => {
  const when = (iso: string): string => iso.slice(0, 10);

  it('calls an open-ended window unlimited', () => {
    expect(voucherWindowLabel(makeVoucher(), when)).toBe('Không giới hạn');
  });

  it('renders a half-open window from one side only', () => {
    expect(voucherWindowLabel(makeVoucher({ startsAt: '2026-08-01T00:00:00.000Z' }), when))
      .toBe('Từ 2026-08-01');
    expect(voucherWindowLabel(makeVoucher({ expiresAt: '2026-09-01T00:00:00.000Z' }), when))
      .toBe('Đến 2026-09-01');
  });

  it('renders a closed window as a range', () => {
    const voucher = makeVoucher({
      startsAt: '2026-08-01T00:00:00.000Z',
      expiresAt: '2026-09-01T00:00:00.000Z',
    });
    expect(voucherWindowLabel(voucher, when)).toBe('2026-08-01 → 2026-09-01');
  });
});

describe('canDeactivateVoucher', () => {
  it('offers the action only while the code is still live', () => {
    expect(canDeactivateVoucher(makeVoucher({ isActive: true }))).toBe(true);
    expect(canDeactivateVoucher(makeVoucher({ isActive: false }))).toBe(false);
  });
});

describe('voucherAdminErrorMessage', () => {
  it('names the duplicate-code conflict', () => {
    expect(voucherAdminErrorMessage({ statusCode: 409, message: 'Voucher SALE10 already exists' }, 'create'))
      .toBe('Mã này đã tồn tại. Hãy chọn một mã khác.');
  });

  it('explains a permission failure for both 401 and 403', () => {
    const expected = 'Bạn không có quyền quản lý mã giảm giá.';
    expect(voucherAdminErrorMessage({ statusCode: 403, message: 'Forbidden' }, 'list')).toBe(expected);
    expect(voucherAdminErrorMessage({ statusCode: 401, message: 'Unauthorized' }, 'list')).toBe(expected);
  });

  it('surfaces the backend validation text on a 400', () => {
    expect(voucherAdminErrorMessage(
      { statusCode: 400, message: 'Percent discount value must be between 1 and 100' },
      'create',
    )).toBe('Percent discount value must be between 1 and 100');
  });

  it('falls back per action when the error carries no message', () => {
    expect(voucherAdminErrorMessage(undefined, 'list')).toBe('Không tải được danh sách mã giảm giá. Vui lòng thử lại.');
    expect(voucherAdminErrorMessage(undefined, 'create')).toBe('Không tạo được mã giảm giá. Vui lòng thử lại.');
    expect(voucherAdminErrorMessage(undefined, 'deactivate')).toBe('Không tắt được mã giảm giá. Vui lòng thử lại.');
  });
});

describe('localInputToIso', () => {
  it('reads a zone-less datetime-local value in the local zone', () => {
    const iso = localInputToIso('2026-08-20T10:00');
    expect(iso).toBe(new Date(2026, 7, 20, 10, 0).toISOString());
  });

  it('returns undefined for blank or unparseable input so the key is omitted', () => {
    expect(localInputToIso('')).toBeUndefined();
    expect(localInputToIso('   ')).toBeUndefined();
    expect(localInputToIso('not-a-date')).toBeUndefined();
  });
});

describe('optionalNumber', () => {
  it('maps a blank field to undefined rather than 0', () => {
    expect(optionalNumber('')).toBeUndefined();
    expect(optionalNumber('  ')).toBeUndefined();
  });

  it('parses a filled field, including an explicit zero', () => {
    expect(optionalNumber('0')).toBe(0);
    expect(optionalNumber('50000')).toBe(50000);
  });
});

describe('buildCreateVoucherDto', () => {
  it('omits every blank optional key so the backend keeps its unlimited defaults', () => {
    const dto = buildCreateVoucherDto({
      ...VOUCHER_FORM_DEFAULTS,
      code: 'sale10',
      discountValue: '10',
    });
    expect(dto).toEqual({
      code: 'SALE10',
      discountType: 'percent',
      discountValue: 10,
      isActive: true,
    });
    expect('usageLimit' in dto).toBe(false);
    expect('startsAt' in dto).toBe(false);
  });

  it('upper-cases and trims the code', () => {
    expect(buildCreateVoucherDto({ ...VOUCHER_FORM_DEFAULTS, code: '  sale10 ', discountValue: '10' }).code)
      .toBe('SALE10');
  });

  it('drops maxDiscountAmount for a fixed voucher, where a cap is meaningless', () => {
    const dto = buildCreateVoucherDto({
      ...VOUCHER_FORM_DEFAULTS,
      code: 'FLAT50',
      discountType: 'fixed',
      discountValue: '50000',
      maxDiscountAmount: '10000',
    });
    expect('maxDiscountAmount' in dto).toBe(false);
  });

  it('keeps the cap for a percent voucher', () => {
    const dto = buildCreateVoucherDto({
      ...VOUCHER_FORM_DEFAULTS,
      code: 'SALE10',
      discountValue: '10',
      maxDiscountAmount: '50000',
    });
    expect(dto.maxDiscountAmount).toBe(50000);
  });

  it('converts the datetime-local fields to ISO-8601', () => {
    const dto = buildCreateVoucherDto({
      ...VOUCHER_FORM_DEFAULTS,
      code: 'SALE10',
      discountValue: '10',
      startsAt: '2026-08-20T10:00',
      expiresAt: '2026-08-30T23:59',
    });
    expect(dto.startsAt).toBe(new Date(2026, 7, 20, 10, 0).toISOString());
    expect(dto.expiresAt).toBe(new Date(2026, 7, 30, 23, 59).toISOString());
  });

  it('carries the numeric limits through', () => {
    const dto = buildCreateVoucherDto({
      ...VOUCHER_FORM_DEFAULTS,
      code: 'SALE10',
      description: '  Giảm 10%  ',
      discountValue: '10',
      minOrderAmount: '100000',
      usageLimit: '100',
      perUserLimit: '1',
      isActive: false,
    });
    expect(dto).toMatchObject({
      description: 'Giảm 10%',
      minOrderAmount: 100000,
      usageLimit: 100,
      perUserLimit: 1,
      isActive: false,
    });
  });
});

describe('voucherFormSchema', () => {
  const validForm = { ...VOUCHER_FORM_DEFAULTS, code: 'SALE10', discountValue: '10' };

  it('accepts a minimal valid form', () => {
    expect(voucherFormSchema.safeParse(validForm).success).toBe(true);
  });

  it('rejects a code with characters that are unsafe in a URL or in print', () => {
    expect(voucherFormSchema.safeParse({ ...validForm, code: 'SALE 10%' }).success).toBe(false);
  });

  it('mirrors the backend 1-100 rule for percent vouchers', () => {
    expect(voucherFormSchema.safeParse({ ...validForm, discountValue: '150' }).success).toBe(false);
    expect(voucherFormSchema.safeParse({ ...validForm, discountValue: '100' }).success).toBe(true);
  });

  it('allows a fixed amount above 100, where the percent cap does not apply', () => {
    const form = { ...validForm, discountType: 'fixed' as const, discountValue: '50000' };
    expect(voucherFormSchema.safeParse(form).success).toBe(true);
  });

  it('rejects a zero or negative discount', () => {
    expect(voucherFormSchema.safeParse({ ...validForm, discountValue: '0' }).success).toBe(false);
    expect(voucherFormSchema.safeParse({ ...validForm, discountValue: '-5' }).success).toBe(false);
  });

  it('leaves blank optional fields valid — blank means unlimited, not invalid', () => {
    const form = { ...validForm, usageLimit: '', perUserLimit: '', minOrderAmount: '', maxDiscountAmount: '' };
    expect(voucherFormSchema.safeParse(form).success).toBe(true);
  });

  it('rejects a non-integer or below-1 usage limit', () => {
    expect(voucherFormSchema.safeParse({ ...validForm, usageLimit: '2.5' }).success).toBe(false);
    expect(voucherFormSchema.safeParse({ ...validForm, usageLimit: '0' }).success).toBe(false);
  });

  it('rejects an end date that is not after the start date', () => {
    const form = { ...validForm, startsAt: '2026-08-20T10:00', expiresAt: '2026-08-20T09:00' };
    const result = voucherFormSchema.safeParse(form);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'expiresAt')).toBe(true);
    }
  });

  it('accepts a start date with no end date', () => {
    expect(voucherFormSchema.safeParse({ ...validForm, startsAt: '2026-08-20T10:00' }).success).toBe(true);
  });
});
