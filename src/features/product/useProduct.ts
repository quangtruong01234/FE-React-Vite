import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { formatPrice } from '@/lib/utils';
import { queryKeys } from '@/hooks/queryKeys';
import type { ProductWithInventory } from '@/types';

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

const generateSellerAvatar = (userId: number | undefined, sellerName: string): string => {
  const seed = userId ?? sellerName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return `https://images.unsplash.com/photo-${1472099645785 + (seed % 1000)}?auto=format&fit=crop&q=80&w=50`;
};

export interface EnrichedProduct extends ProductWithInventory {
  formattedPrice: string;
  online: number;
  seller: string;
  sellerAvatar: string;
  time: string;
  likes: number;
  comments: number;
  shares: number;
}

export function enrichProductForUI(product: ProductWithInventory): EnrichedProduct {
  const seller = product.user?.name ?? product.brand?.name ?? 'Shop Official';
  const sellerAvatar = product.user?.avatar ?? generateSellerAvatar(product.userId, seller);
  return {
    ...product,
    formattedPrice: formatPrice(product.price),
    online: Math.floor(Math.random() * 150) + 5,
    seller,
    sellerAvatar,
    time: getRelativeTime(product.createdAt ?? product.updatedAt),
    likes: product.likesCount || Math.floor(Math.random() * 50) + 5,
    comments: product.commentsCount || Math.floor(Math.random() * 20) + 1,
    shares: product.sharesCount || Math.floor(Math.random() * 10) + 1,
  };
}

interface UseProductReturn {
  products: EnrichedProduct[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useProduct(): UseProductReturn {
  const queryClient = useQueryClient();

  const params = { limit: 10, sortBy: 'updatedAt', sortOrder: 'DESC' as const };
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: async () => {
      const response = await api.products.getList(params);
      return response.data.map(enrichProductForUI);
    },
  });

  function refetch(): void {
    void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
  }

  const errorMsg = error
    ? (typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.')
    : null;

  return { products: data ?? [], loading: isLoading, error: errorMsg, refetch };
}
