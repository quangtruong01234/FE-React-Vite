import type { ProductParams } from '@/types';

/** Slider ceiling — treated as "no upper limit", so it is NOT sent to the API. */
export const DEFAULT_MAX_PRICE = 30_000_000;

export interface ProductQueryState {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  search: string;
  categoryIds: number[];
  brandIds: number[];
  provinceIds: number[];
  minPrice: number;
  maxPrice: number;
}

/**
 * Map the marketplace filter state to API query params, omitting values that
 * are at their neutral default so they don't narrow the result set. In
 * particular `maxPrice` is only sent when the user lowers it below the slider
 * ceiling — by default there is no upper price filter.
 */
export function buildProductParams(state: ProductQueryState): ProductParams {
  const { page, limit, sortBy, sortOrder, search, categoryIds, brandIds, provinceIds, minPrice, maxPrice } = state;
  return {
    page,
    limit,
    sortBy,
    sortOrder,
    ...(search ? { search } : {}),
    ...(categoryIds.length > 0 ? { categoryIds } : {}),
    ...(brandIds.length > 0 ? { brandIds } : {}),
    ...(provinceIds.length > 0 ? { provinceIds } : {}),
    ...(minPrice > 0 ? { minPrice } : {}),
    ...(maxPrice < DEFAULT_MAX_PRICE ? { maxPrice } : {}),
  };
}
