import { describe, it, expect } from 'vitest';
import {
  parseMarketplaceFilters,
  serializeMarketplaceFilters,
  settledFilterPatch,
  MARKETPLACE_DEFAULTS,
} from './marketplaceUrl';
import { DEFAULT_MAX_PRICE } from './productParams';

function sp(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe('parseMarketplaceFilters', () => {
  it('returns pure defaults for an empty query string', () => {
    expect(parseMarketplaceFilters(sp(''))).toEqual(MARKETPLACE_DEFAULTS);
  });

  it('parses every filter param', () => {
    const filters = parseMarketplaceFilters(
      sp('search=sony&category=1,3&brand=7&province=201,299&minPrice=100000&maxPrice=5000000&sort=price_asc&page=2'),
    );
    expect(filters).toEqual({
      search: 'sony',
      categoryIds: [1, 3],
      brandIds: [7],
      provinceIds: [201, 299],
      minPrice: 100_000,
      maxPrice: 5_000_000,
      sort: 'price_asc',
      page: 2,
    });
  });

  it('drops invalid ids from csv lists instead of breaking', () => {
    expect(parseMarketplaceFilters(sp('category=1,abc,-2,0,9')).categoryIds).toEqual([1, 9]);
  });

  it('falls back to defaults on an invalid sort or page', () => {
    const filters = parseMarketplaceFilters(sp('sort=hacked&page=abc'));
    expect(filters.sort).toBe('newest');
    expect(filters.page).toBe(1);
  });

  it('resets an inverted price range to no-filter', () => {
    const filters = parseMarketplaceFilters(sp('minPrice=9000000&maxPrice=1000000'));
    expect(filters.minPrice).toBe(0);
    expect(filters.maxPrice).toBe(DEFAULT_MAX_PRICE);
  });
});

describe('serializeMarketplaceFilters', () => {
  it('serializes defaults to an empty query string', () => {
    expect(serializeMarketplaceFilters(MARKETPLACE_DEFAULTS).toString()).toBe('');
  });

  it('omits page=1 and sort=newest but keeps real values', () => {
    const qs = serializeMarketplaceFilters({
      ...MARKETPLACE_DEFAULTS,
      search: 'tai nghe',
      categoryIds: [2, 5],
      page: 3,
      sort: 'popular',
    });
    expect(qs.get('search')).toBe('tai nghe');
    expect(qs.get('category')).toBe('2,5');
    expect(qs.get('page')).toBe('3');
    expect(qs.get('sort')).toBe('popular');
    expect(qs.has('brand')).toBe(false);
    expect(qs.has('province')).toBe(false);
    expect(qs.has('minPrice')).toBe(false);
    expect(qs.has('maxPrice')).toBe(false);
  });

  it('serializes selected provinces as a csv and omits an empty list', () => {
    const qs = serializeMarketplaceFilters({ ...MARKETPLACE_DEFAULTS, provinceIds: [201, 299] });
    expect(qs.get('province')).toBe('201,299');
  });

  it('round-trips through parse without loss', () => {
    const filters = {
      search: 'ssd',
      categoryIds: [4],
      brandIds: [1, 2],
      provinceIds: [201],
      minPrice: 500_000,
      maxPrice: 2_000_000,
      sort: 'price_desc' as const,
      page: 2,
    };
    expect(parseMarketplaceFilters(serializeMarketplaceFilters(filters))).toEqual(filters);
  });
});

describe('settledFilterPatch', () => {
  const base = { search: '', minPrice: 0, maxPrice: DEFAULT_MAX_PRICE };

  it('returns an empty patch when everything matches the URL', () => {
    expect(settledFilterPatch(base, base, base)).toEqual({});
  });

  it('commits a settled value that diverged from the URL', () => {
    const live = { ...base, search: 'sony' };
    const debounced = { ...base, search: 'sony' };
    expect(settledFilterPatch(live, debounced, base)).toEqual({ search: 'sony' });
  });

  it('does NOT commit while the user is still typing (debounced lags live)', () => {
    const live = { ...base, search: 'sony wh' };
    const debounced = { ...base, search: 'sony' };
    expect(settledFilterPatch(live, debounced, base)).toEqual({});
  });

  it('does NOT clobber an external URL change with a stale debounced value', () => {
    // Header navigated to ?search=iphone → live input synced down instantly,
    // but the old debounced "sony" is still in flight.
    const live = { ...base, search: 'iphone' };
    const debounced = { ...base, search: 'sony' };
    const committed = { ...base, search: 'iphone' };
    expect(settledFilterPatch(live, debounced, committed)).toEqual({});
  });

  it('commits price fields independently of search', () => {
    const live = { search: '', minPrice: 100_000, maxPrice: 5_000_000 };
    const debounced = { search: '', minPrice: 100_000, maxPrice: 5_000_000 };
    expect(settledFilterPatch(live, debounced, base)).toEqual({
      minPrice: 100_000,
      maxPrice: 5_000_000,
    });
  });
});
