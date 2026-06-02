import { z } from 'zod';

export const checkoutSchema = z.object({
  shipping_address: z.string()
    .min(1, 'Địa chỉ giao hàng là bắt buộc')
    .max(500, 'Địa chỉ tối đa 500 ký tự'),
  payment_method: z.enum(['zalopay', 'vnpay', 'cod'], {
    required_error: 'Chọn phương thức thanh toán',
  }),
});
export type CheckoutFormData = z.infer<typeof checkoutSchema>;
