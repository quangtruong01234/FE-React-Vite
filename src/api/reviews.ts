import type { Review, ProductReviewDto, PaginatedResponse } from '@/types';
import { request, toQuery } from './client';

export const reviewsApi = {
  getByProduct: (productId: string, page: number, limit: number): Promise<PaginatedResponse<Review>> => {
    const qs = toQuery({ page, limit });
    return request<PaginatedResponse<Review>>(`/products/${productId}/reviews${qs}`);
  },

  create: (productId: string, data: ProductReviewDto): Promise<Review> =>
    request<Review>(`/products/${productId}/reviews`, { method: 'POST', body: JSON.stringify(data) }),

  delete: (reviewId: number): Promise<void> =>
    request<void>(`/products/reviews/${reviewId}`, { method: 'DELETE' }),
};
