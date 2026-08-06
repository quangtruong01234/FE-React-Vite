import { parsePageParam } from '@/hooks/ui/usePageParam';
import { DEFAULT_MAX_PRICE } from './productParams';

export type SortKey = 'newest' | 'price_asc' | 'price_desc' | 'popular';

const SORT_KEYS: readonly SortKey[] = ['newest', 'price_asc', 'price_desc', 'popular'];

/** Marketplace filter state — the URL query string is the single source of truth. */
export interface MarketplaceFilters {
  search: string;
  categoryIds: number[];
  brandIds: number[];
  provinceIds: number[];
  minPrice: number;
  maxPrice: number;
  sort: SortKey;
  page: number;
}

export const MARKETPLACE_DEFAULTS: MarketplaceFilters = {
  search: '',
  categoryIds: [],
  brandIds: [],
  provinceIds: [],
  minPrice: 0,
  maxPrice: DEFAULT_MAX_PRICE,
  sort: 'newest',
  page: 1,
};

/** Parse a csv id list ("1,2,9") — drops anything that isn't a positive integer. */
function parseIdList(raw: string | null): number[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n >= 1);
}

/** Parse a price param — non-negative integer or the given default. */
function parsePrice(raw: string | null, fallback: number): number {
  const n = Number(raw);
  return raw !== null && Number.isInteger(n) && n >= 0 ? n : fallback;
}

/**
 * Read the marketplace filters out of the URL. Every param is validated so a
 * hand-edited/shared URL degrades to defaults instead of breaking the query.
 */
export function parseMarketplaceFilters(sp: URLSearchParams): MarketplaceFilters {
  const rawSort = sp.get('sort');
  const minPrice = parsePrice(sp.get('minPrice'), MARKETPLACE_DEFAULTS.minPrice);
  const maxPrice = parsePrice(sp.get('maxPrice'), MARKETPLACE_DEFAULTS.maxPrice);
  return {
    search: sp.get('search') ?? '',
    categoryIds: parseIdList(sp.get('category')),
    brandIds: parseIdList(sp.get('brand')),
    provinceIds: parseIdList(sp.get('province')),
    // An inverted range from a hand-edited URL falls back to "no price filter".
    ...(minPrice <= maxPrice
      ? { minPrice, maxPrice }
      : { minPrice: MARKETPLACE_DEFAULTS.minPrice, maxPrice: MARKETPLACE_DEFAULTS.maxPrice }),
    sort: SORT_KEYS.includes(rawSort as SortKey) ? (rawSort as SortKey) : MARKETPLACE_DEFAULTS.sort,
    page: parsePageParam(sp.get('page')),
  };
}

/**
 * Serialize the filters back into a query string, omitting every value that is
 * at its neutral default — so the canonical marketplace URL stays clean and
 * `?page=1`/`?sort=newest` never appear.
 */
export function serializeMarketplaceFilters(f: MarketplaceFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.search) sp.set('search', f.search);
  if (f.categoryIds.length > 0) sp.set('category', f.categoryIds.join(','));
  if (f.brandIds.length > 0) sp.set('brand', f.brandIds.join(','));
  if (f.provinceIds.length > 0) sp.set('province', f.provinceIds.join(','));
  if (f.minPrice > 0) sp.set('minPrice', String(f.minPrice));
  if (f.maxPrice < DEFAULT_MAX_PRICE) sp.set('maxPrice', String(f.maxPrice));
  if (f.sort !== MARKETPLACE_DEFAULTS.sort) sp.set('sort', f.sort);
  if (f.page > 1) sp.set('page', String(f.page));
  return sp;
}

/**
 * Decide which debounced inputs are ready to be committed to the URL.
 *
 * A field is committed only when its debounced value has BOTH settled
 * (equals the live input — the user stopped typing/dragging) AND diverged
 * from what the URL currently holds. The "settled" guard is what makes an
 * external URL change (header search, back/forward) win: the live input is
 * synced down immediately, so a stale in-flight debounced value no longer
 * matches it and cannot clobber the URL.
 */
export function settledFilterPatch(
  live: { search: string; minPrice: number; maxPrice: number },
  debounced: { search: string; minPrice: number; maxPrice: number },
  committed: { search: string; minPrice: number; maxPrice: number },
): Partial<Pick<MarketplaceFilters, 'search' | 'minPrice' | 'maxPrice'>> {
  const patch: Partial<Pick<MarketplaceFilters, 'search' | 'minPrice' | 'maxPrice'>> = {};
  if (debounced.search === live.search && debounced.search !== committed.search) {
    patch.search = debounced.search;
  }
  if (debounced.minPrice === live.minPrice && debounced.minPrice !== committed.minPrice) {
    patch.minPrice = debounced.minPrice;
  }
  if (debounced.maxPrice === live.maxPrice && debounced.maxPrice !== committed.maxPrice) {
    patch.maxPrice = debounced.maxPrice;
  }
  return patch;
}
