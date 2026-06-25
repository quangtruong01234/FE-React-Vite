import { useMutation } from '@tanstack/react-query';
import { api } from '@/api';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/hooks/queryKeys';
import type { Order } from '@/types';

/** Post-`processing` seller transitions (P1-01). */
export type AdvanceKind = 'ship' | 'deliver' | 'complete';

const ADVANCE_FN: Record<AdvanceKind, (id: number) => Promise<Order>> = {
  ship: (id) => api.orders.ship(id),
  deliver: (id) => api.orders.deliver(id),
  complete: (id) => api.orders.complete(id),
};

interface AdvanceVars {
  id: number;
  kind: AdvanceKind;
}

export function useAdvanceOrder(): ReturnType<typeof useMutation<Order, unknown, AdvanceVars>> {
  return useMutation({
    mutationFn: ({ id, kind }: AdvanceVars) => ADVANCE_FN[kind](id),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.seller });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.sellerDetail(id) });
    },
    onError: (error: unknown) => {
      console.error('Advance order failed', error);
    },
  });
}
