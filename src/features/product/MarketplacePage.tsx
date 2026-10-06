import { useState, useMemo, useCallback, useEffect, type ReactElement } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, PackageX, ChevronDown, ChevronUp, Check, Search, X } from 'lucide-react';
import { cn, formatVnd } from '@/lib/format/utils';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import { useProducts } from './useProducts';
import { useProvinces } from '@/features/address/useShippingLocations';
import { useDebouncedValue } from '@/hooks/ui/useDebouncedValue';
import { useResetOnChange } from '@/hooks/ui/useResetOnChange';
import { Pagination } from '@/components/shared/Pagination';
import { FetchingOverlay } from '@/components/shared/FetchingOverlay';
import { DEFAULT_MAX_PRICE } from './productParams';
import {
  marketplaceProductParams,
  parseMarketplaceFilters,
  serializeMarketplaceFilters,
  settledFilterPatch,
  type MarketplaceFilters,
  type SortKey,
} from './marketplaceUrl';
import ProductCard from './ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useT } from '@/hooks/ui/useT';
import { useLanguage } from '@/context/useLanguage';
import type { MessageKey } from '@/lib/i18n/messages';
import { productMessages } from './product.i18n';

const SORT_OPTS: { id: SortKey; label: MessageKey<typeof productMessages> }[] = [
  { id: 'newest', label: 'sortNewest' },
  { id: 'price_asc', label: 'sortPriceAsc' },
  { id: 'price_desc', label: 'sortPriceDesc' },
  { id: 'popular', label: 'sortPopular' },
];

function CardSkeleton(): ReactElement {
  return (
    <div className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden flex flex-col">
      <Skeleton className="w-full aspect-square bg-canvas-elevated" />
      <div className="p-3 flex flex-col gap-2">
        <Skeleton className="h-4 w-full bg-canvas-elevated rounded" />
        <Skeleton className="h-3 w-2/3 bg-canvas-elevated rounded" />
        <div className="flex items-end justify-between mt-auto pt-1">
          <Skeleton className="h-5 w-24 bg-canvas-elevated rounded" />
          <Skeleton className="w-8 h-8 bg-canvas-elevated rounded-lg" />
        </div>
      </div>
    </div>
  );
}

interface SelectFilterProps {
  label: string;
  items: { id: number; name: string }[];
  selected: number[];
  onChange: (ids: number[]) => void;
}

function SelectFilter({ label, items, selected, onChange }: SelectFilterProps): ReactElement {
  const t = useT(productMessages);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? items.filter(i => i.name.toLowerCase().includes(q)) : items;
  }, [items, search]);

  function toggle(id: number): void {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-body font-semibold text-ink-sec uppercase tracking-wide">
          {label}
          {selected.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center size-4 rounded-full bg-tb-gradient text-ink-on-accent text-[9px] font-black">
              {selected.length}
            </span>
          )}
        </span>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[10px] text-accent-amber hover:text-tb-amber/70 transition-colors cursor-pointer font-body"
          >
            {t('clearSelection')}
          </button>
        )}
      </div>

      {/* Search input */}
      <div className="relative mb-2">
        <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted shrink-0 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('searchIn', { label: label.toLowerCase() })}
          className="w-full bg-canvas-base border border-bdr rounded-tb-input py-1.5 pl-7 pr-7 text-ink-pri text-xs font-body placeholder:text-ink-muted outline-none focus:border-tb-amber/50 transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label={t('clearSearch')}
            className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center text-ink-muted hover:text-ink-sec transition-colors cursor-pointer"
          >
            <X size={11} className="shrink-0" />
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto pr-0.5">
        {filtered.length === 0 && (
          <p className="text-xs text-ink-muted font-body px-2.5 py-1.5">{t('noMatch')}</p>
        )}
        {filtered.map(item => {
          const active = selected.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
              className={cn(
                'flex items-center justify-between gap-2 text-left text-sm px-2.5 py-1.5 rounded-tb-ghost cursor-pointer bg-transparent border-0 transition-colors font-body w-full',
                active ? 'bg-canvas-elevated text-accent-amber' : 'text-ink-pri hover:bg-canvas-elevated',
              )}
            >
              <span className="truncate">{item.name}</span>
              {active && <Check size={12} className="shrink-0 text-accent-amber" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function MarketplacePage(): ReactElement {
  const t = useT(productMessages);
  const { lang } = useLanguage();
  // The URL query string is the single source of truth for every filter —
  // reload, share, and back/forward all restore the exact same result set.
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseMarketplaceFilters(searchParams), [searchParams]);

  // Live input state for fast-changing fields (typing, slider drags); settled
  // values are committed to the URL by the effect below.
  const [search, setSearch] = useState(filters.search);
  const [minPrice, setMinPrice] = useState<number>(filters.minPrice);
  const [maxPrice, setMaxPrice] = useState<number>(filters.maxPrice);
  const [filterOpen, setFilterOpen] = useState(true);

  const updateFilters = useCallback(
    (patch: Partial<MarketplaceFilters>, opts?: { replace?: boolean }) => {
      setSearchParams((prev) => {
        const cur = parseMarketplaceFilters(prev);
        // Any filter change jumps back to page 1 — unless the patch IS a page change.
        return serializeMarketplaceFilters({ ...cur, ...patch, page: patch.page ?? 1 });
      }, opts);
    },
    [setSearchParams],
  );

  // External URL changes (header search, back/forward) sync down into the live
  // inputs — during render, so no stale-value flash. The guard keeps the user's
  // own commits from echoing back into an input they are still editing.
  useResetOnChange(filters.search, () => {
    if (filters.search !== search) setSearch(filters.search);
  });
  useResetOnChange(filters.minPrice, () => {
    if (filters.minPrice !== minPrice) setMinPrice(filters.minPrice);
  });
  useResetOnChange(filters.maxPrice, () => {
    if (filters.maxPrice !== maxPrice) setMaxPrice(filters.maxPrice);
  });

  // Debounce typing/slider drags so the URL (and the request) only updates once
  // the value settles — committed with `replace` to avoid history spam.
  const debouncedSearch = useDebouncedValue(search, 400);
  const debouncedMinPrice = useDebouncedValue(minPrice, 400);
  const debouncedMaxPrice = useDebouncedValue(maxPrice, 400);

  useEffect(() => {
    const patch = settledFilterPatch(
      { search, minPrice, maxPrice },
      { search: debouncedSearch, minPrice: debouncedMinPrice, maxPrice: debouncedMaxPrice },
      { search: filters.search, minPrice: filters.minPrice, maxPrice: filters.maxPrice },
    );
    if (Object.keys(patch).length > 0) updateFilters(patch, { replace: true });
  }, [
    search, minPrice, maxPrice,
    debouncedSearch, debouncedMinPrice, debouncedMaxPrice,
    filters.search, filters.minPrice, filters.maxPrice,
    updateFilters,
  ]);

  const { categoryIds, brandIds, provinceIds, sort, page } = filters;
  const params = marketplaceProductParams(filters);

  const { data, isLoading, isFetching, error } = useProducts(params);
  const products = data?.data ?? [];
  const hasNext = data?.hasNext ?? false;
  const totalPages = data?.totalPages ?? 0;

  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: () => api.products.getCategories(),
  });

  const { data: brands = [] } = useQuery({
    queryKey: queryKeys.brands.all,
    queryFn: () => api.products.getBrands(),
  });

  const { data: provinces = [] } = useProvinces();

  function handleSortChange(newSort: SortKey): void {
    updateFilters({ sort: newSort });
  }

  function handleCategoryChange(ids: number[]): void {
    updateFilters({ categoryIds: ids });
  }

  function handleBrandChange(ids: number[]): void {
    updateFilters({ brandIds: ids });
  }

  function handleProvinceChange(ids: number[]): void {
    updateFilters({ provinceIds: ids });
  }

  // Price inputs only touch live state — the settle effect commits to the URL.
  function handleMinPriceChange(value: number): void {
    setMinPrice(value);
  }

  function handleMaxPriceChange(value: number): void {
    setMaxPrice(value);
  }

  function handleSearchSubmit(e: React.FormEvent): void {
    e.preventDefault();
    updateFilters({ search });
  }

  function clearFilters(): void {
    setSearch('');
    setMinPrice(0);
    setMaxPrice(DEFAULT_MAX_PRICE);
    setSearchParams(new URLSearchParams());
  }

  const hasActiveFilters = categoryIds.length > 0 || brandIds.length > 0 || provinceIds.length > 0 || minPrice > 0 || maxPrice < DEFAULT_MAX_PRICE || !!search;

  return (
    <div className="min-h-screen bg-canvas-base">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h1 className="font-display font-black text-3xl uppercase tracking-tight text-ink-pri m-0">
              {t('marketTitle')}
            </h1>
            <p className="text-sm text-ink-sec m-0">
              {data ? t('productCount', { count: data.total }) : ''}
              {search && (
                <>{t('resultsFor')}&quot;<span className="text-accent-amber">{search}</span>&quot;</>
              )}
            </p>
          </div>

          {/* Sort tabs */}
          <div className="flex gap-2 flex-wrap">
            {SORT_OPTS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSortChange(opt.id)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-body font-semibold border cursor-pointer transition-colors',
                  sort === opt.id
                    ? 'bg-tb-gradient border-transparent text-ink-on-accent'
                    : 'bg-canvas-elevated border-bdr text-ink-sec hover:border-ink-muted',
                )}
              >
                {t(opt.label)}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile search */}
        <form onSubmit={handleSearchSubmit} className="relative mb-4 lg:hidden">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchProducts')}
            className="w-full bg-canvas-elevated border border-bdr rounded-tb-input py-2.5 px-3.5 text-ink-pri text-[13px] font-body placeholder:text-ink-muted outline-none focus:border-tb-amber/50 transition-colors"
          />
        </form>

        <div className="grid gap-6 items-start lg:grid-cols-[auto_1fr]">
          {/* Sidebar */}
          <aside className={cn('hidden lg:flex flex-col gap-4 sticky top-[76px]', filterOpen ? 'w-[345px]' : 'w-auto')}>
            <div className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden">
              {/* Header toggle */}
              <button
                type="button"
                onClick={() => setFilterOpen(o => !o)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-canvas-elevated transition-colors cursor-pointer"
              >
                <span className="font-display font-bold uppercase tracking-wide text-sm text-ink-pri flex items-center gap-2">
                  <SlidersHorizontal size={15} className="text-accent-amber shrink-0" />
                  {t('filters')}
                  {hasActiveFilters && (
                    <span className="size-4 rounded-full bg-tb-gradient text-ink-on-accent text-[9px] font-black grid place-items-center">
                      {categoryIds.length + brandIds.length + provinceIds.length + (minPrice > 0 || maxPrice < DEFAULT_MAX_PRICE ? 1 : 0) + (search ? 1 : 0)}
                    </span>
                  )}
                </span>
                {filterOpen
                  ? <ChevronUp size={14} className="text-ink-muted shrink-0" />
                  : <ChevronDown size={14} className="text-ink-muted shrink-0" />
                }
              </button>

              {filterOpen && (
                <div className="px-4 pb-4 pt-1 flex flex-col border-t border-bdr">
                  {/* Search */}
                  <form onSubmit={handleSearchSubmit} className="mb-4 mt-3 relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted shrink-0 pointer-events-none" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t('searchProducts')}
                      className="w-full bg-canvas-elevated border border-bdr rounded-tb-input py-2 pl-9 pr-3 text-ink-pri text-xs font-body placeholder:text-ink-muted outline-none focus:border-tb-amber/50 transition-colors"
                    />
                  </form>

                  {/* Divider */}
                  <div className="border-t border-bdr mb-4" />

                  {/* Category select */}
                  <SelectFilter
                    label={t('category')}
                    items={categories}
                    selected={categoryIds}
                    onChange={handleCategoryChange}
                  />

                  <div className="border-t border-bdr mb-4" />

                  {/* Brand select */}
                  <SelectFilter
                    label={t('brand')}
                    items={brands}
                    selected={brandIds}
                    onChange={handleBrandChange}
                  />

                  <div className="border-t border-bdr mb-4" />

                  {/* Seller province select (GHN provinces; matches seller default address) */}
                  <SelectFilter
                    label={t('province')}
                    items={provinces}
                    selected={provinceIds}
                    onChange={handleProvinceChange}
                  />

                  <div className="border-t border-bdr mb-4" />

                  {/* Price range */}
                  <div>
                    <div className="text-xs font-body font-semibold text-ink-sec uppercase tracking-wide mb-2">
                      {t('priceRange')}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="number"
                        min={0}
                        max={maxPrice}
                        step={100_000}
                        value={minPrice > 0 ? minPrice : ''}
                        onChange={(e) => handleMinPriceChange(e.target.value === '' ? 0 : Math.min(Number(e.target.value), maxPrice))}
                        placeholder={t('priceFrom')}
                        className="w-full bg-canvas-elevated border border-bdr rounded-tb-input py-1.5 px-2 text-ink-pri text-xs font-mono placeholder:text-ink-muted outline-none focus:border-tb-amber/50 transition-colors"
                      />
                      <span className="text-ink-muted text-xs flex-none">—</span>
                      <input
                        type="number"
                        min={minPrice}
                        max={DEFAULT_MAX_PRICE}
                        step={100_000}
                        value={maxPrice < DEFAULT_MAX_PRICE ? maxPrice : ''}
                        onChange={(e) => handleMaxPriceChange(e.target.value === '' ? DEFAULT_MAX_PRICE : Math.max(Number(e.target.value), minPrice))}
                        placeholder={t('priceTo')}
                        className="w-full bg-canvas-elevated border border-bdr rounded-tb-input py-1.5 px-2 text-ink-pri text-xs font-mono placeholder:text-ink-muted outline-none focus:border-tb-amber/50 transition-colors"
                      />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={DEFAULT_MAX_PRICE}
                      step={500_000}
                      value={maxPrice}
                      onChange={(e) => handleMaxPriceChange(Math.max(Number(e.target.value), minPrice))}
                      className="w-full accent-tb-amber"
                    />
                    <div className="flex justify-between text-[10px] text-ink-muted font-mono mt-1">
                      <span>{formatVnd(minPrice, lang)}</span>
                      <span>{maxPrice < DEFAULT_MAX_PRICE ? formatVnd(maxPrice, lang) : t('noLimit')}</span>
                    </div>
                  </div>

                  {/* Clear all */}
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-4 w-full py-2 rounded-tb-ghost border border-bdr text-ink-sec text-xs font-body hover:bg-canvas-elevated hover:text-ink-pri transition-colors cursor-pointer bg-transparent"
                    >
                      {t('clearAllFilters')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </aside>

          {/* Main grid */}
          <div>
            {error && (
              <div className="mb-4 px-4 py-3 rounded-tb-ghost bg-tb-red/10 border border-tb-red/30 text-accent-red text-sm font-body">
                {(error as { message?: string }).message ?? t('loadFailed')}
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <PackageX size={48} className="text-ink-muted shrink-0" />
                <div>
                  <p className="font-display font-bold text-lg text-ink-pri m-0">
                    {t('emptyTitle')}
                  </p>
                  <p className="text-sm text-ink-muted mt-1 m-0">
                    {t('emptyHint')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2 rounded-tb-ghost border border-bdr text-ink-sec text-sm font-body hover:bg-canvas-elevated hover:text-ink-pri transition-colors cursor-pointer bg-transparent"
                >
                  {t('clearFilters')}
                </button>
              </div>
            ) : (
              <FetchingOverlay fetching={isFetching && !isLoading}>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {/* First row (≤ 4 cols) is above the fold → eager, high priority. */}
                  {products.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}
                </div>
              </FetchingOverlay>
            )}

            {/* Pagination */}
            {!isLoading && products.length > 0 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                hasNext={hasNext}
                onPageChange={(p) => updateFilters({ page: p })}
                className="mt-6 pt-4 border-t border-bdr"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
