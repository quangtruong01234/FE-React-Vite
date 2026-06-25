import type { PaymentMethod } from '@/types';

/** Human label for each payment method. Shared across buyer + seller order views. */
export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cod:     'Thanh toán khi nhận hàng (COD)',
  zalopay: 'ZaloPay',
  vnpay:   'VNPay',
};
