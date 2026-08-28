import { describe, it, expect } from 'vitest';
import {
  voucherStatusMeta,
  voucherDiscountLabel,
  voucherUsageLabel,
  voucherWindowLabel,
  canDeactivateVoucher,
  canReactivateVoucher,
  voucherAdminErrorMessage,
  localInputToIso,
  optionalNumber,
  buildCreateVoucherDto,
  voucherToFormData,
  buildUpdateVoucherDto,
  hasVoucherEdits,
  voucherTighteningFields,
  voucherEditBlockedMessage,
  voucherLooseningConfirm,
  voucherActiveToggleCopy,
} from './voucherAdmin';
import {
  voucherCreateSchema,
  voucherEditSchema,
  VOUCHER_FORM_DEFAULTS,
} from './voucherAdmin.schema';
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

describe('voucherCreateSchema', () => {
  const validForm = { ...VOUCHER_FORM_DEFAULTS, code: 'SALE10', discountValue: '10' };

  it('accepts a minimal valid form', () => {
    expect(voucherCreateSchema.safeParse(validForm).success).toBe(true);
  });

  it('rejects a code with characters that are unsafe in a URL or in print', () => {
    expect(voucherCreateSchema.safeParse({ ...validForm, code: 'SALE 10%' }).success).toBe(false);
  });

  it('mirrors the backend 1-100 rule for percent vouchers', () => {
    expect(voucherCreateSchema.safeParse({ ...validForm, discountValue: '150' }).success).toBe(false);
    expect(voucherCreateSchema.safeParse({ ...validForm, discountValue: '100' }).success).toBe(true);
  });

  it('mirrors VOUCHER-GUARD-01: a fixed voucher must stay under the minimum order', () => {
    const base = { ...validForm, discountType: 'fixed' as const };
    expect(
      voucherCreateSchema.safeParse({ ...base, discountValue: '50000', minOrderAmount: '50000' }).success,
    ).toBe(false);
    expect(
      voucherCreateSchema.safeParse({ ...base, discountValue: '50000', minOrderAmount: '60000' }).success,
    ).toBe(true);
  });

  it('rejects a fixed voucher with no minimum at all — the backend compares against 0', () => {
    const base = { ...validForm, discountType: 'fixed' as const, discountValue: '50000' };
    expect(voucherCreateSchema.safeParse({ ...base, minOrderAmount: '' }).success).toBe(false);
    expect(voucherCreateSchema.safeParse({ ...base, minOrderAmount: '0' }).success).toBe(false);
  });

  it('blames the minimum, not the discount value, which is read-only when editing', () => {
    const result = voucherCreateSchema.safeParse({
      ...validForm,
      discountType: 'fixed' as const,
      discountValue: '50000',
      minOrderAmount: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'minOrderAmount')).toBe(true);
      expect(result.error.issues.some((issue) => issue.path[0] === 'discountValue')).toBe(false);
    }
  });

  it('leaves a percent voucher untouched by the fixed-vs-minimum guard', () => {
    const form = { ...validForm, discountValue: '10', minOrderAmount: '5' };
    expect(voucherCreateSchema.safeParse(form).success).toBe(true);
  });

  it('allows a fixed amount above 100, where the percent cap does not apply', () => {
    const form = {
      ...validForm,
      discountType: 'fixed' as const,
      discountValue: '50000',
      minOrderAmount: '200000',
    };
    expect(voucherCreateSchema.safeParse(form).success).toBe(true);
  });

  it('rejects a zero or negative discount', () => {
    expect(voucherCreateSchema.safeParse({ ...validForm, discountValue: '0' }).success).toBe(false);
    expect(voucherCreateSchema.safeParse({ ...validForm, discountValue: '-5' }).success).toBe(false);
  });

  it('leaves blank optional fields valid — blank means unlimited, not invalid', () => {
    const form = { ...validForm, usageLimit: '', perUserLimit: '', minOrderAmount: '', maxDiscountAmount: '' };
    expect(voucherCreateSchema.safeParse(form).success).toBe(true);
  });

  it('rejects a non-integer or below-1 usage limit', () => {
    expect(voucherCreateSchema.safeParse({ ...validForm, usageLimit: '2.5' }).success).toBe(false);
    expect(voucherCreateSchema.safeParse({ ...validForm, usageLimit: '0' }).success).toBe(false);
  });

  it('rejects an end date that is not after the start date', () => {
    const form = { ...validForm, startsAt: '2026-08-20T10:00', expiresAt: '2026-08-20T09:00' };
    const result = voucherCreateSchema.safeParse(form);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'expiresAt')).toBe(true);
    }
  });

  it('accepts a start date with no end date', () => {
    expect(voucherCreateSchema.safeParse({ ...validForm, startsAt: '2026-08-20T10:00' }).success).toBe(true);
  });
});

describe('voucherEditSchema', () => {
  const validForm = { ...VOUCHER_FORM_DEFAULTS, code: 'SALE10', discountValue: '10' };

  it('still keeps a legacy fixed voucher editable — the guard is not re-checked here', () => {
    // A row created before VOUCHER-GUARD-01 can violate it. Blocking the form
    // would leave the admin unable to fix the description or turn the code off.
    const form = {
      ...validForm,
      discountType: 'fixed' as const,
      discountValue: '50000',
      minOrderAmount: '10000',
    };
    expect(voucherCreateSchema.safeParse(form).success).toBe(false);
    expect(voucherEditSchema.safeParse(form).success).toBe(true);
  });

  it('keeps every shared rule — the percent cap and the date order', () => {
    expect(voucherEditSchema.safeParse({ ...validForm, discountValue: '150' }).success).toBe(false);
    expect(
      voucherEditSchema.safeParse({
        ...validForm,
        startsAt: '2026-08-20T10:00',
        expiresAt: '2026-08-20T09:00',
      }).success,
    ).toBe(false);
  });
});

describe('voucherToFormData', () => {
  it('rehydrates a row into form state, flattening DECIMAL strings', () => {
    const form = voucherToFormData(
      makeVoucher({ discountValue: '10.00', minOrderAmount: '100000.00', usageLimit: 100 }),
    );
    expect(form.discountValue).toBe('10');
    expect(form.minOrderAmount).toBe('100000');
    expect(form.usageLimit).toBe('100');
  });

  it('renders every "unlimited" field as blank, never as 0', () => {
    const form = voucherToFormData(
      makeVoucher({ maxDiscountAmount: null, usageLimit: null, perUserLimit: null, expiresAt: null }),
    );
    expect(form.maxDiscountAmount).toBe('');
    expect(form.usageLimit).toBe('');
    expect(form.perUserLimit).toBe('');
    expect(form.expiresAt).toBe('');
  });

  it('round-trips a date through the local input format', () => {
    const voucher = makeVoucher({ startsAt: '2026-08-20T03:00:00.000Z' });
    const form = voucherToFormData(voucher);
    expect(localInputToIso(form.startsAt)).toBe(voucher.startsAt);
  });
});

describe('buildUpdateVoucherDto', () => {
  const original = makeVoucher({
    description: 'Giảm 10%',
    minOrderAmount: '100000.00',
    usageLimit: 100,
    expiresAt: '2026-09-01T00:00:00.000Z',
  });

  it('sends nothing when the form still matches the row', () => {
    expect(buildUpdateVoucherDto(voucherToFormData(original), original)).toEqual({});
  });

  it('sends only the field that changed', () => {
    const form = { ...voucherToFormData(original), minOrderAmount: '50000' };
    expect(buildUpdateVoucherDto(form, original)).toEqual({ minOrderAmount: 50000 });
  });

  it('does not read seconds the date input cannot hold as an edit', () => {
    // The prod row E2EPROD0806 expires at :59.000Z; datetime-local stops at
    // minutes, so a rebuilt ISO is 59s earlier than the stored one.
    const dated = makeVoucher({ expiresAt: '2026-12-31T23:59:59.000Z' });
    expect(buildUpdateVoucherDto(voucherToFormData(dated), dated)).toEqual({});
  });

  it('still sends a date the admin actually moved', () => {
    const dated = makeVoucher({ expiresAt: '2026-12-31T23:59:59.000Z' });
    const form = { ...voucherToFormData(dated), expiresAt: '2027-02-01T10:30' };
    expect(buildUpdateVoucherDto(form, dated).expiresAt).toBe(
      localInputToIso('2027-02-01T10:30'),
    );
  });

  it('still clears a date the admin emptied', () => {
    const dated = makeVoucher({ expiresAt: '2026-12-31T23:59:59.000Z' });
    const form = { ...voucherToFormData(dated), expiresAt: '' };
    expect(buildUpdateVoucherDto(form, dated).expiresAt).toBeNull();
  });

  it('clears the minimum as 0, never as null — null is a 500 on that column', () => {
    // `minOrderAmount` is NOT NULL DEFAULT 0 and the handler calls `.toFixed(2)`
    // on it unguarded, while `@IsOptional()` waves a null past the pipe.
    const form = { ...voucherToFormData(original), minOrderAmount: '' };
    const dto = buildUpdateVoucherDto(form, original);
    expect(dto.minOrderAmount).toBe(0);
  });

  it('omits an already-zero minimum the admin left empty', () => {
    const zeroed = makeVoucher({ minOrderAmount: '0.00' });
    const form = { ...voucherToFormData(zeroed), minOrderAmount: '' };
    expect('minOrderAmount' in buildUpdateVoucherDto(form, zeroed)).toBe(false);
  });

  it('reads "0" typed over a "0.00" row as no edit at all', () => {
    const zeroed = makeVoucher({ minOrderAmount: '0.00' });
    expect('minOrderAmount' in buildUpdateVoucherDto(voucherToFormData(zeroed), zeroed)).toBe(false);
  });

  it('turns a cleared field into an explicit null, not an omitted key', () => {
    const form = { ...voucherToFormData(original), usageLimit: '', description: '' };
    const dto = buildUpdateVoucherDto(form, original);
    expect(dto.usageLimit).toBeNull();
    expect(dto.description).toBeNull();
  });

  it('omits an already-empty optional field instead of clearing it again', () => {
    const form = voucherToFormData(original);
    expect('perUserLimit' in buildUpdateVoucherDto(form, original)).toBe(false);
  });

  it('never sends the immutable code/type/value the backend rejects', () => {
    const form = { ...voucherToFormData(original), code: 'OTHER', discountValue: '99' };
    const dto = buildUpdateVoucherDto(form, original);
    expect(Object.keys(dto)).toEqual([]);
  });

  it('drops a cap edit on a fixed voucher, where a cap is meaningless', () => {
    const fixed = makeVoucher({ discountType: 'fixed', discountValue: '50000.00' });
    const form = { ...voucherToFormData(fixed), maxDiscountAmount: '10000' };
    expect('maxDiscountAmount' in buildUpdateVoucherDto(form, fixed)).toBe(false);
  });

  it('carries the on/off switch as isActive', () => {
    const form = { ...voucherToFormData(original), isActive: false };
    expect(buildUpdateVoucherDto(form, original)).toEqual({ isActive: false });
  });
});

describe('voucherTighteningFields', () => {
  const original = makeVoucher({
    minOrderAmount: '100000.00',
    maxDiscountAmount: '50000.00',
    usageLimit: 100,
    expiresAt: '2026-09-01T00:00:00.000Z',
  });

  it('names a raised minimum and a shrunken cap', () => {
    const fields = voucherTighteningFields(
      { minOrderAmount: 200000, maxDiscountAmount: 20000 },
      original,
    );
    expect(fields).toEqual(['Đơn tối thiểu', 'Giảm tối đa']);
  });

  it('treats the loosest value as loosening, never as tightening', () => {
    // Null on the nullable columns, 0 on `minOrderAmount` — that one is NOT
    // NULL, so "no minimum" is a zero, not a null.
    expect(
      voucherTighteningFields(
        { minOrderAmount: 0, maxDiscountAmount: null, usageLimit: null, expiresAt: null },
        original,
      ),
    ).toEqual([]);
  });

  it('reads an earlier end date as tightening and a later one as loosening', () => {
    expect(voucherTighteningFields({ expiresAt: '2026-08-20T00:00:00.000Z' }, original)).toEqual([
      'Thời gian kết thúc',
    ]);
    expect(voucherTighteningFields({ expiresAt: '2026-10-01T00:00:00.000Z' }, original)).toEqual([]);
  });
});

describe('voucherEditBlockedMessage', () => {
  it('lets any edit through while the voucher is unused', () => {
    const unused = makeVoucher({ usedCount: 0, minOrderAmount: '100000.00' });
    expect(voucherEditBlockedMessage({ minOrderAmount: 500000 }, unused)).toBeNull();
  });

  it('blocks tightening once the voucher has been redeemed', () => {
    const used = makeVoucher({ usedCount: 3, minOrderAmount: '100000.00' });
    expect(voucherEditBlockedMessage({ minOrderAmount: 500000 }, used)).toContain('Đơn tối thiểu');
  });

  it('still allows loosening a redeemed voucher', () => {
    const used = makeVoucher({ usedCount: 3, minOrderAmount: '100000.00' });
    expect(voucherEditBlockedMessage({ minOrderAmount: 50000 }, used)).toBeNull();
  });

  it('blocks a usage limit below what has already been redeemed', () => {
    const used = makeVoucher({ usedCount: 5, usageLimit: 100 });
    expect(voucherEditBlockedMessage({ usageLimit: 3 }, used)).toContain('5');
  });

  it('mirrors VOUCHER-GUARD-01 on a fixed voucher, even with zero redemptions', () => {
    // The backend re-checks `discountValue >= minOrderAmount` on any patch that
    // carries a minimum — `usedCount` does not enter into it.
    const fixed = makeVoucher({
      discountType: 'fixed',
      discountValue: '50000.00',
      minOrderAmount: '200000.00',
      usedCount: 0,
    });
    expect(voucherEditBlockedMessage({ minOrderAmount: 50000 }, fixed)).toContain('đơn tối thiểu');
    expect(voucherEditBlockedMessage({ minOrderAmount: 60000 }, fixed)).toBeNull();
  });

  it('blocks a cleared minimum on a fixed voucher — "no minimum" is 0 there', () => {
    const fixed = makeVoucher({
      discountType: 'fixed',
      discountValue: '50000.00',
      minOrderAmount: '200000.00',
    });
    expect(voucherEditBlockedMessage({ minOrderAmount: 0 }, fixed)).not.toBeNull();
  });

  it('leaves a fixed voucher alone when the patch carries no minimum', () => {
    // A legacy row that already violates the guard must stay editable, exactly
    // as the backend allows — it only re-checks when a minimum is present.
    const legacy = makeVoucher({
      discountType: 'fixed',
      discountValue: '50000.00',
      minOrderAmount: '10000.00',
    });
    expect(voucherEditBlockedMessage({ description: 'Đổi mô tả' }, legacy)).toBeNull();
    expect(voucherEditBlockedMessage({ isActive: false }, legacy)).toBeNull();
  });

  it('never applies the guard to a percent voucher', () => {
    const percent = makeVoucher({ discountValue: '10.00', minOrderAmount: '100000.00' });
    expect(voucherEditBlockedMessage({ minOrderAmount: 5 }, percent)).toBeNull();
  });
});

describe('voucherLooseningConfirm', () => {
  it('asks nothing for an unused voucher', () => {
    expect(voucherLooseningConfirm({ minOrderAmount: 1 }, makeVoucher({ usedCount: 0 }))).toBeNull();
  });

  it('asks before a one-way loosening of a redeemed voucher', () => {
    const used = makeVoucher({ usedCount: 3, code: 'SALE10' });
    expect(voucherLooseningConfirm({ minOrderAmount: 0 }, used)).toContain('SALE10');
  });

  it('does not ask when only the on/off switch or the description moved', () => {
    const used = makeVoucher({ usedCount: 3 });
    expect(voucherLooseningConfirm({ isActive: false, description: 'x' }, used)).toBeNull();
  });
});

describe('hasVoucherEdits', () => {
  it('separates a real patch from an empty no-op', () => {
    expect(hasVoucherEdits({})).toBe(false);
    expect(hasVoucherEdits({ isActive: true })).toBe(true);
  });
});

describe('canReactivateVoucher', () => {
  it('offers the way back on only for a voucher that is off', () => {
    expect(canReactivateVoucher(makeVoucher({ isActive: false }))).toBe(true);
    expect(canReactivateVoucher(makeVoucher({ isActive: true }))).toBe(false);
  });
});

describe('voucherActiveToggleCopy', () => {
  it('never tells a deactivated voucher that it is on', () => {
    expect(voucherActiveToggleCopy(true, false).state).toBe('Đã tắt');
    expect(voucherActiveToggleCopy(true, true).state).toBe('Đang bật');
  });

  it('keeps one stable accessible name per mode — the switch role announces the state', () => {
    expect(voucherActiveToggleCopy(true, false).label).toBe(voucherActiveToggleCopy(true, true).label);
    expect(voucherActiveToggleCopy(false, false).label).toBe(voucherActiveToggleCopy(false, true).label);
  });

  it('phrases create mode as an intent, not a current state', () => {
    expect(voucherActiveToggleCopy(false, true).state).toBe('Kích hoạt ngay');
  });
});
