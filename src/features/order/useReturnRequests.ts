import { useMutation, useQuery, keepPreviousData, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/api';
import { invalidateOrderViews } from '@/lib/query/orderInvalidation';
import { queryClient } from '@/lib/query/queryClient';
import { queryKeys } from '@/hooks/query/queryKeys';
import type { CreateReturnRequestDto, PaginatedResponse, ReturnRequest, ReturnRequestStatus } from '@/types';

export function useMyReturnRequests(
  page = 1,
  limit = 10,
  enabled = true,
  q = '',
): UseQueryResult<PaginatedResponse<ReturnRequest>> {
  return useQuery({
    queryKey: queryKeys.orders.returnMine(page, limit, q),
    queryFn: () => api.orders.getMyReturnRequests(page, limit, q),
    enabled,
    // Keep the previous page rendered while the next one loads (no empty flash).
    placeholderData: keepPreviousData,
  });
}

/** Seller/admin queue — seller only sees requests on orders containing their products. */
export function useReturnRequestQueue(
  page = 1,
  limit = 10,
  status?: ReturnRequestStatus,
  q = '',
): UseQueryResult<PaginatedResponse<ReturnRequest>> {
  return useQuery({
    queryKey: queryKeys.orders.returnQueue(page, limit, status, q),
    queryFn: () => api.orders.getReturnRequests(page, limit, status, q),
    placeholderData: keepPreviousData,
  });
}

export function useRequestReturn(
  orderId: string,
  meId: string,
): UseMutationResult<ReturnRequest, unknown, CreateReturnRequestDto> {
  return useMutation({
    // Build the body with `returnRequestPayload` — it drops an empty `imageUrls`.
    mutationFn: (body: CreateReturnRequestDto) => api.orders.requestReturn(orderId, body),
    onSuccess: () => {
      // The order flips to `return_requested` — refresh its detail, the buyer's
      // history/badges and every request list.
      invalidateOrderViews({ orderId, buyerId: meId, returns: true });
    },
  });
}

export type ReviewReturnVariables =
  | { id: string; action: 'approve' }
  | { id: string; action: 'reject'; reason: string };

/** Approve (order → refunded) or reject (order restored) a return request. */
export function useReviewReturnRequest(): UseMutationResult<ReturnRequest, unknown, ReviewReturnVariables> {
  return useMutation({
    mutationFn: (vars: ReviewReturnVariables) =>
      vars.action === 'approve'
        ? api.orders.approveReturnRequest(vars.id)
        : api.orders.rejectReturnRequest(vars.id, vars.reason),
    onSuccess: (_data, vars) => {
      // The decision also mutates the underlying order's status (refunded or
      // restored) — sweep the whole orders prefix to cover seller lists,
      // buyer history and order details.
      invalidateOrderViews({ all: true });
      // RETURN-STOCK-01: an approval credits `availableStock` back, so every
      // cached stock read (product detail, with-inventory, low-stock) is stale.
      if (vars.action === 'approve') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      }
    },
  });
}
