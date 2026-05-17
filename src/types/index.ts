export interface User {
  id: number;
  username: string;
  email: string;
}

export interface Brand {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Inventory {
  availableStock: number;
  reservedStock: number;
  totalStock: number;
  isLowStock: boolean;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  sku: string;
  condition: 'new' | 'used' | 'refurbished';
  brandId?: number;
  categoryId: number;
  userId: number;
  brand?: Brand;
  category?: Category;
  user?: { name?: string; avatar?: string };
  isFeatured: boolean;
  isTrending: boolean;
  rating: number;
  ratingCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewCount: number;
  sellerNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductWithInventory extends Product {
  inventory: Inventory;
}

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
  stockQuantity: number;
}

export interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  total: number;
  status: 'pending' | 'completed' | 'canceled';
  created_at: string;
  items: OrderItem[];
}

export interface PaginatedResponse<T> {
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
  };
}

export interface ProductParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  isActive?: boolean;
  categoryId?: number;
  brandId?: number;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
}

export interface CreateOrderItemDto {
  product_id: number;
  quantity: number;
  price: number;
}

export interface CreateProductDto {
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  sku: string;
  brandId?: number;
  categoryId: number;
  condition: string;
  imageUrl?: string;
  sellerNotes?: string;
  userId: number;
  isFeatured: boolean;
  isTrending: boolean;
  rating: number;
  ratingCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewCount: number;
}

export interface ApiError {
  status: number;
  message: string;
}
