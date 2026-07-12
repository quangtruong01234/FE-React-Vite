import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import type { ProductReviewDto } from '@/types';

export function useProductReviews(productId: number, page: number) {
  return useQuery({
    // Page belongs in the key — with only `byProduct(productId)` a page change
    // never refetched. `byProduct` stays as the invalidation prefix.
    queryKey: queryKeys.reviews.byProductPage(productId, page),
    queryFn: () => api.reviews.getByProduct(productId, page, 10),
    placeholderData: keepPreviousData,
  });
}

export function useCreateReview(productId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductReviewDto) => api.reviews.create(productId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.byProduct(productId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(productId) });
    },
  });
}

export function useDeleteReview(productId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: number) => api.reviews.delete(reviewId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.byProduct(productId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(productId) });
    },
  });
}
