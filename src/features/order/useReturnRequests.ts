import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/api';
import { invalidateOrderViews } from '@/lib/query/orderInvalidation';
import { queryKeys } from '@/hooks/query/queryKeys';
import type { PaginatedResponse, ReturnRequest, ReturnRequestStatus } from '@/types';

export function useMyReturnRequests(
  page = 1,
  limit = 10,
  enabled = true,
): UseQueryResult<PaginatedResponse<ReturnRequest>> {
  return useQuery({
    queryKey: queryKeys.orders.returnMine(page, limit),
    queryFn: () => api.orders.getMyReturnRequests(page, limit),
    enabled,
  });
}

/** Seller/admin queue — seller only sees requests on orders containing their products. */
export function useReturnRequestQueue(
  page = 1,
  limit = 10,
  status?: ReturnRequestStatus,
): UseQueryResult<PaginatedResponse<ReturnRequest>> {
  return useQuery({
    queryKey: queryKeys.orders.returnQueue(page, limit, status),
    queryFn: () => api.orders.getReturnRequests(page, limit, status),
  });
}

export function useRequestReturn(
  orderId: number,
  meId: number,
): UseMutationResult<ReturnRequest, unknown, string> {
  return useMutation({
    mutationFn: (reason: string) => api.orders.requestReturn(orderId, reason),
    onSuccess: () => {
      // The order flips to `return_requested` — refresh its detail, the buyer's
      // history/badges and every request list.
      invalidateOrderViews({ orderId, buyerId: meId, returns: true });
    },
  });
}

export type ReviewReturnVariables =
  | { id: number; action: 'approve' }
  | { id: number; action: 'reject'; reason: string };

/** Approve (order → refunded) or reject (order restored) a return request. */
export function useReviewReturnRequest(): UseMutationResult<ReturnRequest, unknown, ReviewReturnVariables> {
  return useMutation({
    mutationFn: (vars: ReviewReturnVariables) =>
      vars.action === 'approve'
        ? api.orders.approveReturnRequest(vars.id)
        : api.orders.rejectReturnRequest(vars.id, vars.reason),
    onSuccess: () => {
      // The decision also mutates the underlying order's status (refunded or
      // restored) — sweep the whole orders prefix to cover seller lists,
      // buyer history and order details.
      invalidateOrderViews({ all: true });
    },
  });
}
