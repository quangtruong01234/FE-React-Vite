import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/api';
import { formatPrice } from '@/lib/format/utils';
import { queryKeys } from '@/hooks/query/queryKeys';
import type { ProductParams, ProductWithInventory, PaginatedResponse } from '@/types';

const getRelativeTime = (dateString?: string): string => {
  if (!dateString) return 'Vừa xong';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Vừa xong';
  const diffInHours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
  if (diffInHours < 1) return 'Vài phút trước';
  if (diffInHours < 24) return `${diffInHours} giờ trước`;
  const diffInDays = Math.floor(diffInHours / 24);
  return diffInDays === 1 ? '1 ngày trước' : `${diffInDays} ngày trước`;
};

export interface EnrichedProduct extends ProductWithInventory {
  formattedPrice: string;
  seller: string;
  sellerAvatar: string;
  time: string;
  likes: number;
  comments: number;
  shares: number;
  online: number;
}

export function enrichProductForUI(product: ProductWithInventory): EnrichedProduct {
  const seller = product.user?.name ?? product.brand?.name ?? 'Shop Official';
  const sellerAvatar = product.user?.avatar ?? '';
  return {
    ...product,
    formattedPrice: formatPrice(product.price),
    seller,
    sellerAvatar,
    time: getRelativeTime(product.createdAt ?? product.updatedAt),
    likes: product.likesCount,
    comments: product.commentsCount,
    shares: product.sharesCount,
    online: product.viewCount,
  };
}

export function useProducts(
  params: ProductParams = {},
  options: { enabled?: boolean } = {},
): {
  data: PaginatedResponse<ProductWithInventory> | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
} {
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: () => api.products.getList(params),
    enabled: options.enabled ?? true,
    // Paginated/filtered list — keep the previous page rendered while the next
    // one loads instead of flashing an empty grid (isFetching signals the swap).
    placeholderData: keepPreviousData,
  });
}
