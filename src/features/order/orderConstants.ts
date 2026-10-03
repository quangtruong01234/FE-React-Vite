import type { PaymentMethod } from '@/types';
import type { Lang } from '@/lib/i18n/lang';
import { translate } from '@/lib/i18n/messages';
import { orderMessages } from './order.i18n';

/** Human label for each payment method. Shared across buyer + seller order views. */
export function paymentLabel(method: PaymentMethod, lang: Lang = 'vi'): string {
  switch (method) {
    case 'cod':
      return translate(orderMessages, lang, 'payCod');
    case 'zalopay':
      return 'ZaloPay';
    case 'vnpay':
      return 'VNPay';
    default:
      return method;
  }
}
