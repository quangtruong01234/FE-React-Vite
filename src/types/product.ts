import type { Brand, Category } from './catalog';
import type { Inventory } from './inventory';

// --- Product ---

export type ProductCondition = 'new' | 'used' | 'refurbished';

export interface Product {
  id: string;
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
  userId: string;
  brand?: Brand;
  category?: Category;
  /** Full hydrated categories — every product read returns both this and `categoryIds`. */
  categories?: Category[];
  user?: { id: string; name?: string; avatar?: string };
  /** Seller's province from their default GHN address; `null` when the seller
   *  has no default address (BE handoff 2026-07-16). */
  sellerProvince?: { id: number; name: string } | null;
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
  /** GHN ProvinceIDs — filters by the seller's default-address province. */
  provinceIds?: number[];
  userId?: string;
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
  /** Optional. Omit for base-price products and the backend provisions a
   *  fallback SKU (`PROD-<productId>`); SKU-matrix products manage SKUs per row. */
  sku?: string;
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

/**
 * The six product columns `PATCH /products/:id` accepts an explicit `null` for,
 * meaning "clear this column" (backend 2026-08-07). Every other field REJECTS
 * `null` with a 400 — omit the key to leave it unchanged.
 */
export type ClearableProductField =
  | 'description'
  | 'sku'
  | 'brandId'
  | 'sellerNotes'
  | 'weight'
  | 'imageUrls';

/**
 * Edit payload for `PATCH /products/:id`: every field optional, and only the
 * clearable ones may carry `null`. Built by `dirtyProductPatch`.
 */
export type UpdateProductDto = Omit<Partial<CreateProductDto>, ClearableProductField> & {
  [K in ClearableProductField]?: CreateProductDto[K] | null;
};

// --- Wishlist / favorites (F6) ---

/** A product row returned by `GET /products/wishlist` — the standard product
 *  shape plus the timestamp the current user favorited it. */
export interface WishlistItem extends Product {
  wishlistedAt: string;
}

/** Response of `POST /products/wishlist/:productId` (idempotent add). */
export interface WishlistToggleResult {
  productId: string;
  isWishlisted: boolean;
  createdAt: string;
}

// --- Admin product risk queue (AI-02) ---

/** Advisory risk flags computed post-commit by the backend scorer — never
 *  blocking, never auto-unlisting. Weights sum into `riskScore` (0..100). */
export type ProductRiskFlag =
  | { type: 'duplicate_image'; weight: number; matchedProductId: string; hammingDistance: number }
  | { type: 'price_anomaly'; weight: number; productPrice: number; categoryMedian: number; ratio: number }
  | { type: 'similar_name'; weight: number; matchedProductId: string; similarity: number };

/** Durable scoring lifecycle (AI-02F1): `pending` = queued/awaiting the scorer,
 *  `ready` = scored, `failed` = scorer errored (retry metadata below). */
export type RiskScoringStatus = 'pending' | 'ready' | 'failed';

/** Product row from `GET /products/admin/risk` — standard product shape plus
 *  additive advisory scoring fields. Clean/unscored products return `0`/`[]`
 *  (backend normalizes at the response boundary — never `null`). */
export interface RiskProduct extends Product {
  riskScore: number;
  riskFlags: ProductRiskFlag[];
  riskScoringStatus: RiskScoringStatus;
  riskScoredAt: string | null;
  riskScoringAttempts: number;
  riskNextRetryAt: string | null;
  riskLastError: string | null;
}

/** Response of `POST /products/admin/risk/:id/rescore`. */
export interface ProductRescoreResult {
  productId: string;
  riskScore: number;
  riskFlags: ProductRiskFlag[];
}

export interface ProductRiskParams {
  /** Minimum risk score filter (0..100). Backend default is 1; 0 includes clean/unscored products. */
  minScore?: number;
  page?: number;
  limit?: number;
}

/** Body of `POST /products/admin/risk/backfill` — cursor-resumable legacy
 *  scoring. `cursor` is the numeric DB cursor from the previous response. */
export interface RiskBackfillParams {
  cursor?: number;
  limit?: number;
}

/** `202` response of the backfill endpoint. */
export interface RiskBackfillResult {
  enqueued: number;
  nextCursor: number | null;
  hasMore: boolean;
}

/** Admin duplicate-review feedback (AI-02F4) — audit-only, never unlists. */
export type RiskFeedbackDecision = 'confirmed_duplicate' | 'dismissed';

export interface RiskFeedbackDto {
  decision: RiskFeedbackDecision;
  /** Optional moderator note, max 500 chars server-side. */
  note?: string;
}

/** Audit record returned by `POST /products/admin/risk/:id/feedback` — FE only
 *  needs the echo; fields kept optional to stay tolerant of the audit shape. */
export interface RiskFeedbackRecord {
  productId?: string;
  decision: RiskFeedbackDecision;
  note?: string | null;
  createdAt?: string;
}

/** Response of `POST /products/risk/duplicate-check` (seller advisory, AI-02F3).
 *  `match` is `null` when no likely duplicate was found. */
export interface DuplicateCheckResult {
  duplicateLikely: boolean;
  match: {
    productId: string;
    name: string;
    imageUrl: string;
    hammingDistance: number;
    evidenceCount: number;
  } | null;
}

// --- Catalog price suggestion (AI-01) ---

/** Advisory catalog price statistics from `GET /products/price-suggestion` —
 *  integer VND. `sampleSize < 3` returns `sufficientData: false` with every
 *  price field `null`. Never validates or changes the submitted price. */
export interface PriceSuggestion {
  sufficientData: boolean;
  sampleSize: number;
  median: number | null;
  p25: number | null;
  p75: number | null;
  min: number | null;
  max: number | null;
}

export interface PriceSuggestionParams {
  categoryId: number;
  brandId?: number;
  condition?: ProductCondition;
}

// --- Product reviews ---

export interface ProductReviewDto {
  rating: number;
  comment?: string | null;
}

export interface Review {
  id: number;
  productId: string;
  userId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}
