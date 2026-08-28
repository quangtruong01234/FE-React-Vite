import { z } from 'zod';

/**
 * Create-voucher form (F3-ADMIN). Every numeric/date field is kept as a
 * **string** here because that is what the native inputs produce, and because a
 * blank optional field must stay blank — coercing it would turn "unlimited"
 * into `0`, which the backend reads as a real limit. `buildCreateVoucherDto`
 * does the string → payload conversion once the form is valid.
 */

/** Codes are stored upper-cased server-side; keep them URL/print safe. */
const CODE_PATTERN = /^[A-Za-z0-9_-]+$/;
/** Money: digits with an optional 2-decimal tail (DECIMAL(12,2) server-side). */
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;
const INTEGER_PATTERN = /^\d+$/;

const optionalAmount = z
  .string()
  .refine((v) => v.trim() === '' || AMOUNT_PATTERN.test(v.trim()), 'Nhập số tiền hợp lệ (VND)');

const optionalCount = z
  .string()
  .refine(
    (v) => v.trim() === '' || (INTEGER_PATTERN.test(v.trim()) && Number(v.trim()) >= 1),
    'Nhập số nguyên từ 1 trở lên',
  );

const voucherFormObject = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, 'Bắt buộc')
      .max(64, 'Tối đa 64 ký tự')
      .regex(CODE_PATTERN, 'Chỉ dùng chữ, số, gạch ngang và gạch dưới'),
    description: z.string().max(255, 'Tối đa 255 ký tự'),
    discountType: z.enum(['percent', 'fixed'], { error: 'Chọn loại giảm giá' }),
    discountValue: z
      .string()
      .trim()
      .min(1, 'Bắt buộc')
      .refine((v) => AMOUNT_PATTERN.test(v) && Number(v) > 0, 'Nhập số lớn hơn 0'),
    minOrderAmount: optionalAmount,
    maxDiscountAmount: optionalAmount,
    usageLimit: optionalCount,
    perUserLimit: optionalCount,
    startsAt: z.string(),
    expiresAt: z.string(),
    isActive: z.boolean(),
  });

type VoucherFormShape = z.infer<typeof voucherFormObject>;
type Ctx = z.core.$RefinementCtx<VoucherFormShape>;

/** Rules that hold in both modes — they only read fields, never the mode. */
function refineShared(form: VoucherFormShape, ctx: Ctx): void {
  // Mirrors the backend guard (PERCENT_VALUE_INVALID) so a 400 never has to
  // teach the admin the rule after a round-trip.
  const value = Number(form.discountValue.trim());
  if (form.discountType === 'percent' && Number.isFinite(value) && (value <= 0 || value > 100)) {
    ctx.addIssue({
      code: 'custom',
      path: ['discountValue'],
      message: 'Giảm theo phần trăm phải trong khoảng 1–100',
    });
  }

  const startsAt = form.startsAt.trim() ? new Date(form.startsAt).getTime() : null;
  const expiresAt = form.expiresAt.trim() ? new Date(form.expiresAt).getTime() : null;
  if (
    startsAt !== null &&
    expiresAt !== null &&
    Number.isFinite(startsAt) &&
    Number.isFinite(expiresAt) &&
    expiresAt <= startsAt
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['expiresAt'],
      message: 'Ngày kết thúc phải sau ngày bắt đầu',
    });
  }
}

/**
 * VOUCHER-GUARD-01, create-side: the backend runs
 * `discountValue >= (minOrderAmount ?? 0)` on **every** fixed voucher, so a
 * blank minimum is not "no comparison" — it compares against `0` and always
 * throws. A fixed voucher therefore needs a minimum strictly above its own
 * value, and the issue belongs on `minOrderAmount`: `discountValue` is
 * `readOnly` in edit mode, so pointing there would blame a field the admin
 * cannot touch.
 *
 * Not applied in edit mode: the backend only re-checks this when the patch
 * actually carries a minimum, so a legacy row that already violates the rule
 * must still be editable (description, dates, on/off). The diff-aware mirror in
 * `voucherEditBlockedMessage` covers the patches that do carry one.
 */
function refineFixedMinimum(form: VoucherFormShape, ctx: Ctx): void {
  if (form.discountType !== 'fixed') return;
  const value = Number(form.discountValue.trim());
  if (!Number.isFinite(value)) return;
  const raw = form.minOrderAmount.trim();
  const minOrder = raw ? Number(raw) : 0;
  if (!Number.isFinite(minOrder) || value >= minOrder) {
    ctx.addIssue({
      code: 'custom',
      path: ['minOrderAmount'],
      message: 'Mã giảm tiền cố định cần đơn tối thiểu lớn hơn số tiền giảm',
    });
  }
}

/** New code: `code`, `discountType` and `discountValue` are all still in play. */
export const voucherCreateSchema = voucherFormObject.superRefine((form, ctx) => {
  refineShared(form, ctx);
  refineFixedMinimum(form, ctx);
});

/** Existing code: same fields, minus the guard the backend won't re-check. */
export const voucherEditSchema = voucherFormObject.superRefine(refineShared);

export type VoucherFormData = z.infer<typeof voucherCreateSchema>;

/** Blank form — every optional field starts empty so nothing is sent by default. */
export const VOUCHER_FORM_DEFAULTS: VoucherFormData = {
  code: '',
  description: '',
  discountType: 'percent',
  discountValue: '',
  minOrderAmount: '',
  maxDiscountAmount: '',
  usageLimit: '',
  perUserLimit: '',
  startsAt: '',
  expiresAt: '',
  isActive: true,
};
