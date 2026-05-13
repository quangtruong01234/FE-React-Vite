import { useState, useEffect } from 'react';
import { api } from '../../shared/services/api.js';

const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

const getRelativeTime = (dateString) => {
  if (!dateString) return 'Vừa xong';
  const now = new Date();
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Vừa xong';
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
  if (diffInHours < 1) return 'Vài phút trước';
  if (diffInHours < 24) return `${diffInHours} giờ trước`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return '1 ngày trước';
  return `${diffInDays} ngày trước`;
};

const generateSellerAvatar = (userId, sellerName) => {
  const seed = userId || sellerName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `https://images.unsplash.com/photo-${1472099645785 + (seed % 1000)}?auto=format&fit=crop&q=80&w=50`;
};

export const enrichProductForUI = (product) => {
  try {
    const seller = product.user?.name || product.brand?.name || 'Shop Official';
    const sellerAvatar = product.user?.avatar || generateSellerAvatar(product.userId, seller);
    return {
      ...product,
      price: formatPrice(product.price),
      online: Math.floor(Math.random() * 150) + 5,
      seller,
      sellerAvatar,
      time: getRelativeTime(product.createdAt || product.updatedAt),
      likes: product.likesCount || Math.floor(Math.random() * 50) + 5,
      comments: product.commentsCount || Math.floor(Math.random() * 20) + 1,
      shares: product.sharesCount || Math.floor(Math.random() * 10) + 1,
      views: product.viewCount || 0,
      rating: product.rating || 0,
      ratingCount: product.ratingCount || 0,
      condition: product.condition || 'new',
      isFeatured: product.isFeatured || false,
      isTrending: product.isTrending || false,
      sellerNotes: product.sellerNotes,
    };
  } catch (error) {
    console.error('❌ Error enriching product:', error, 'Product:', product.name || product.id);
    return product;
  }
};

export function useProduct(enabled, onUnauthorized) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    async function fetchProducts() {
      try {
        setLoading(true);
        setError(null);

        const response = await api.product.getAll({
          limit: 10,
          sortBy: 'updatedAt',
          sortOrder: 'DESC',
          isActive: true,
        });

        if (!mounted) return;

        let items = [];
        if (Array.isArray(response)) {
          items = response;
        } else if (response?.data?.items && Array.isArray(response.data.items)) {
          items = response.data.items;
        } else if (response?.items && Array.isArray(response.items)) {
          items = response.items;
        } else if (response?.data && Array.isArray(response.data)) {
          items = response.data;
        } else if (response?.products && Array.isArray(response.products)) {
          items = response.products;
        } else {
          console.warn('Unexpected response format:', response);
        }

        if (!mounted) return;
        setProducts(items.map(enrichProductForUI));
        setError(null);
      } catch (err) {
        if (!mounted) return;
        if (err.code === 'UNAUTHORIZED') {
          onUnauthorized?.();
          return;
        }
        console.error('❌ Failed to fetch products:', err);
        setError('Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchProducts();
    return () => { mounted = false; };
  }, [enabled]);

  function addProduct(newProduct) {
    setProducts(prev => [enrichProductForUI(newProduct), ...prev]);
  }

  return { products, loading, error, addProduct };
}
