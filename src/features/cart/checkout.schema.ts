import { z } from 'zod';

// The shipping address now comes from the user's saved address book (see
// AddressBookPicker + buildGhnShippingAddress); the checkout form itself only
// captures the payment method.
export const checkoutSchema = z.object({
  paymentMethod: z.enum(['zalopay', 'vnpay', 'cod'], {
    error: 'Chọn phương thức thanh toán',
  }),
});
export type CheckoutFormData = z.infer<typeof checkoutSchema>;
