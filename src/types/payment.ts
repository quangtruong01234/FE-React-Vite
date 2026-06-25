// --- Payment ---

export type PaymentMethod = 'zalopay' | 'vnpay' | 'cod';

export interface PaymentOption {
  id: PaymentMethod;
  name: string;
  description: string;
}

export interface PaymentResult {
  gateway: string;
  status: string;
  transId: string;
  amount: string;
}
