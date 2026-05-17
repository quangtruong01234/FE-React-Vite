import { useState, useEffect } from 'react';
import { api } from '@/api';
import { useAuthContext } from '@/context/AuthContext';
import type { ProductWithInventory } from '@/types';

const formatPrice = (price: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

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
  const { handleUnauthorized } = useAuthContext();
  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function refetch(): void {
    setRefreshKey((k) => k + 1);
  }

  useEffect(() => {
    let mounted = true;

    async function fetchProducts(): Promise<void> {
      try {
        setLoading(true);
        setError(null);
        const response = await api.products.getList({ limit: 10, sortBy: 'updatedAt', sortOrder: 'DESC' });
        if (!mounted) return;

        let raw: unknown[] = [];
        if (Array.isArray(response)) {
          raw = response as unknown[];
        } else if (typeof response === 'object' && response !== null) {
          const r = response as Record<string, unknown>;
          if (Array.isArray(r['items'])) raw = r['items'] as unknown[];
          else if (typeof r['data'] === 'object' && r['data'] !== null && Array.isArray((r['data'] as Record<string, unknown>)['items']))
            raw = (r['data'] as Record<string, unknown>)['items'] as unknown[];
          else if (Array.isArray(r['data'])) raw = r['data'] as unknown[];
          else if (Array.isArray(r['products'])) raw = r['products'] as unknown[];
        }

        if (!mounted) return;
        setProducts((raw as ProductWithInventory[]).map(enrichProductForUI));
      } catch (e: unknown) {
        if (!mounted) return;
        if (typeof e === 'object' && e !== null && 'status' in e && (e as { status: unknown }).status === 401) {
          handleUnauthorized();
          return;
        }
        const msg = typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.';
        setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void fetchProducts();
    return () => { mounted = false; };
  }, [refreshKey, handleUnauthorized]);

  return { products, loading, error, refetch };
}
