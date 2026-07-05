import type { PaymentOption, PaymentResult } from '@/types';
import { request, toQuery } from './client';

export const paymentApi = {
  getOptions: (): Promise<{ options: PaymentOption[] }> =>
    request<{ options: PaymentOption[] }>('/payment/options'),

  getResult: (params: Record<string, string>): Promise<PaymentResult> => {
    const qs = toQuery(params);
    return request<PaymentResult>(`/gateway/payment-result${qs}`);
  },
};
