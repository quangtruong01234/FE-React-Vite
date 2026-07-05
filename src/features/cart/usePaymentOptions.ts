import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import type { PaymentOption } from '@/types';

export function usePaymentOptions(): {
  options: PaymentOption[];
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.payment.options,
    queryFn: () => api.payment.getOptions(),
  });
  return { options: data?.options ?? [], isLoading };
}
