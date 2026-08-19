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

export const voucherFormSchema = z
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
  })
  .superRefine((form, ctx) => {
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
  });

export type VoucherFormData = z.infer<typeof voucherFormSchema>;

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
