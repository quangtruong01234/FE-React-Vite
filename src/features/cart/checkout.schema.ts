import { z } from 'zod';

// GHN requires the shipping address pipe-delimited into exactly 6 parts:
// "name|phone|address|ward|district|province". Collect them as structured
// fields and join on submit (see buildShippingAddress in CheckoutPage).
export const checkoutSchema = z.object({
  fullName: z.string()
    .trim()
    .min(1, 'Họ tên người nhận là bắt buộc')
    .max(100, 'Họ tên tối đa 100 ký tự'),
  phone: z.string()
    .trim()
    .min(8, 'Số điện thoại không hợp lệ')
    .max(15, 'Số điện thoại không hợp lệ')
    .regex(/^[0-9+\s-]+$/, 'Số điện thoại không hợp lệ'),
  addressLine: z.string()
    .trim()
    .min(1, 'Số nhà, tên đường là bắt buộc')
    .max(200, 'Địa chỉ tối đa 200 ký tự'),
  ward: z.string()
    .trim()
    .min(1, 'Phường/xã là bắt buộc')
    .max(100, 'Phường/xã tối đa 100 ký tự'),
  district: z.string()
    .trim()
    .min(1, 'Quận/huyện là bắt buộc')
    .max(100, 'Quận/huyện tối đa 100 ký tự'),
  province: z.string()
    .trim()
    .min(1, 'Tỉnh/thành phố là bắt buộc')
    .max(100, 'Tỉnh/thành phố tối đa 100 ký tự'),
  paymentMethod: z.enum(['zalopay', 'vnpay', 'cod'], {
    error: 'Chọn phương thức thanh toán',
  }),
});
export type CheckoutFormData = z.infer<typeof checkoutSchema>;

/** The six address fields, in GHN pipe order. */
export const ADDRESS_FIELDS = [
  'fullName',
  'phone',
  'addressLine',
  'ward',
  'district',
  'province',
] as const satisfies readonly (keyof CheckoutFormData)[];

/** Join the structured address fields into the GHN pipe-delimited string. */
export function buildShippingAddress(data: CheckoutFormData): string {
  return ADDRESS_FIELDS
    // strip any literal "|" so the 6-part split stays exact
    .map((f) => String(data[f]).trim().replace(/\|/g, ' '))
    .join('|');
}
