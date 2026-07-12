import type { Brand, Category } from './catalog';
import type { Inventory } from './inventory';

// --- Product ---

export type ProductCondition = 'new' | 'used' | 'refurbished';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  imageUrls?: string[] | null;
  sku: string;
  condition: ProductCondition;
  brandId?: number;
  categoryId: number;
  categoryIds: number[];
  isActive?: boolean;
  approvalBlocked?: boolean;
  userId: number;
  brand?: Brand;
  category?: Category;
  /** Full hydrated categories — every product read returns both this and `categoryIds`. */
  categories?: Category[];
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
  /** Shipping weight in grams. Backend column is nullable (`int`), so an
   *  unweighed product reads back as `null`; used for GHN shipping-fee calc. */
  weight?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Variation {
  name: string;
  options: string[];
}

export interface ProductSku {
  id: number;
  sku: string;
  price: number;
  stock: number;
  stockQuantity: number;
  tierIdx: number[];
  imageUrl?: string;
}

export interface ProductWithInventory extends Product {
  inventory: Inventory;
  variations?: Variation[];
  skus?: ProductSku[];
}

export interface ProductParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  isActive?: boolean;
  categoryIds?: number[];
  brandIds?: number[];
  minPrice?: number;
  maxPrice?: number;
  userId?: number;
  skuSearch?: string;
}

export interface ProductVariation {
  name: string;
  options: string[];
}

export interface ProductSkuTier {
  tierIdx: string;
  price: number;
  stockQuantity: number;
}

export interface CreateProductDto {
  name: string;
  description?: string;
  price: number;
  stockQuantity?: number;
  sku: string;
  brandId?: number | null;
  categoryIds: number[];
  isActive?: boolean;
  isFeatured?: boolean;
  isTrending?: boolean;
  condition?: ProductCondition;
  sellerNotes?: string;
  weight?: number;
  imageUrls?: string[];
  variations?: ProductVariation[];
  skuList?: ProductSkuTier[];
}

// --- Wishlist / favorites (F6) ---

/** A product row returned by `GET /products/wishlist` — the standard product
 *  shape plus the timestamp the current user favorited it. */
export interface WishlistItem extends Product {
  wishlistedAt: string;
}

/** Response of `POST /products/wishlist/:productId` (idempotent add). */
export interface WishlistToggleResult {
  productId: number;
  isWishlisted: boolean;
  createdAt: string;
}

// --- Product reviews ---

export interface ProductReviewDto {
  rating: number;
  comment?: string | null;
}

export interface Review {
  id: number;
  productId: number;
  userId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}
