import { useState, useEffect, useMemo, type ReactElement } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, PackageX, ChevronDown, ChevronUp, Check, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/api';
import { queryKeys } from '@/hooks/queryKeys';
import { useProducts } from './useProducts';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Pagination } from '@/components/shared/Pagination';
import { buildProductParams, DEFAULT_MAX_PRICE } from './productParams';
import ProductCard from './ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProductParams } from '@/types';

type SortKey = 'newest' | 'price_asc' | 'price_desc' | 'popular';

const SORT_OPTS: { id: SortKey; label: string }[] = [
  { id: 'newest', label: 'Mới nhất' },
  { id: 'price_asc', label: 'Giá ↑' },
  { id: 'price_desc', label: 'Giá ↓' },
  { id: 'popular', label: 'Phổ biến' },
];

function sortToParams(sort: SortKey): Pick<ProductParams, 'sortBy' | 'sortOrder'> {
  switch (sort) {
    case 'price_asc': return { sortBy: 'price', sortOrder: 'ASC' };
    case 'price_desc': return { sortBy: 'price', sortOrder: 'DESC' };
    case 'popular': return { sortBy: 'viewCount', sortOrder: 'DESC' };
    case 'newest':
    default:
      return { sortBy: 'createdAt', sortOrder: 'DESC' };
  }
}

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
            <span className="ml-1.5 inline-flex items-center justify-center size-4 rounded-full bg-tb-gradient text-ink-pri text-[9px] font-black">
              {selected.length}
            </span>
          )}
        </span>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[10px] text-accent-amber hover:text-accent-amber/70 transition-colors cursor-pointer font-body"
          >
            Bỏ chọn
          </button>
        )}
      </div>

      {/* Search input */}
      <div className="relative mb-2">
        <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted shrink-0 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Tìm ${label.toLowerCase()}…`}
          className="w-full bg-canvas-base border border-bdr rounded-tb-input py-1.5 pl-7 pr-7 text-ink-pri text-xs font-body placeholder:text-ink-muted outline-none focus:border-accent-amber/50 transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-sec transition-colors cursor-pointer"
          >
            <X size={11} className="shrink-0" />
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto pr-0.5">
        {filtered.length === 0 && (
          <p className="text-xs text-ink-muted font-body px-2.5 py-1.5">Không tìm thấy</p>
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
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');

  useEffect(() => {
    const param = searchParams.get('search') ?? '';
    setSearch(param);
    setPage(1);
  }, [searchParams]);

  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [brandIds, setBrandIds] = useState<number[]>([]);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(DEFAULT_MAX_PRICE);
  const [sort, setSort] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(true);

  // Debounce price so dragging the slider doesn't fire a request on every tick.
  const debouncedMinPrice = useDebouncedValue(minPrice, 400);
  const debouncedMaxPrice = useDebouncedValue(maxPrice, 400);

  const sortParams = sortToParams(sort);
  const params: ProductParams = buildProductParams({
    page,
    limit: 12,
    sortBy: sortParams.sortBy ?? 'createdAt',
    sortOrder: sortParams.sortOrder ?? 'DESC',
    search,
    categoryIds,
    brandIds,
    minPrice: debouncedMinPrice,
    maxPrice: debouncedMaxPrice,
  });

  const { data, isLoading, error } = useProducts(params);
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

  function handleSortChange(newSort: SortKey): void {
    setSort(newSort);
    setPage(1);
  }

  function handleCategoryChange(ids: number[]): void {
    setCategoryIds(ids);
    setPage(1);
  }

  function handleBrandChange(ids: number[]): void {
    setBrandIds(ids);
    setPage(1);
  }

  function handleMinPriceChange(value: number): void {
    setMinPrice(value);
    setPage(1);
  }

  function handleMaxPriceChange(value: number): void {
    setMaxPrice(value);
    setPage(1);
  }

  function handleSearchSubmit(e: React.FormEvent): void {
    e.preventDefault();
    setPage(1);
  }

  function clearFilters(): void {
    setSearch('');
    setCategoryIds([]);
    setBrandIds([]);
    setMinPrice(0);
    setMaxPrice(DEFAULT_MAX_PRICE);
    setSort('newest');
    setPage(1);
  }

  const hasActiveFilters = categoryIds.length > 0 || brandIds.length > 0 || minPrice > 0 || maxPrice < DEFAULT_MAX_PRICE || !!search;

  return (
    <div className="min-h-screen bg-canvas-base">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h1 className="font-display font-black text-3xl uppercase tracking-tight text-ink-pri m-0">
              Chợ sản phẩm
            </h1>
            <p className="text-sm text-ink-sec m-0">
              {data ? `${data.total} sản phẩm` : ''}
              {search && (
                <> · kết quả cho &quot;<span className="text-accent-amber">{search}</span>&quot;</>
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
                    ? 'bg-tb-gradient border-transparent text-ink-pri'
                    : 'bg-canvas-elevated border-bdr text-ink-sec hover:border-ink-muted',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile search */}
        <form onSubmit={handleSearchSubmit} className="relative mb-4 lg:hidden">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm sản phẩm…"
            className="w-full bg-canvas-elevated border border-bdr rounded-tb-input py-2.5 px-3.5 text-ink-pri text-[13px] font-body placeholder:text-ink-muted outline-none focus:border-accent-amber/50 transition-colors"
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
                  Bộ lọc
                  {hasActiveFilters && (
                    <span className="size-4 rounded-full bg-tb-gradient text-ink-pri text-[9px] font-black grid place-items-center">
                      {categoryIds.length + brandIds.length + (minPrice > 0 || maxPrice < DEFAULT_MAX_PRICE ? 1 : 0) + (search ? 1 : 0)}
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
                      placeholder="Tìm sản phẩm…"
                      className="w-full bg-canvas-elevated border border-bdr rounded-tb-input py-2 pl-9 pr-3 text-ink-pri text-xs font-body placeholder:text-ink-muted outline-none focus:border-accent-amber/50 transition-colors"
                    />
                  </form>

                  {/* Divider */}
                  <div className="border-t border-bdr mb-4" />

                  {/* Category select */}
                  <SelectFilter
                    label="Danh mục"
                    items={categories}
                    selected={categoryIds}
                    onChange={handleCategoryChange}
                  />

                  <div className="border-t border-bdr mb-4" />

                  {/* Brand select */}
                  <SelectFilter
                    label="Thương hiệu"
                    items={brands}
                    selected={brandIds}
                    onChange={handleBrandChange}
                  />

                  <div className="border-t border-bdr mb-4" />

                  {/* Price range */}
                  <div>
                    <div className="text-xs font-body font-semibold text-ink-sec uppercase tracking-wide mb-2">
                      Khoảng giá
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="number"
                        min={0}
                        max={maxPrice}
                        step={100_000}
                        value={minPrice > 0 ? minPrice : ''}
                        onChange={(e) => handleMinPriceChange(e.target.value === '' ? 0 : Math.min(Number(e.target.value), maxPrice))}
                        placeholder="Từ"
                        className="w-full bg-canvas-elevated border border-bdr rounded-tb-input py-1.5 px-2 text-ink-pri text-xs font-mono placeholder:text-ink-muted outline-none focus:border-accent-amber/50 transition-colors"
                      />
                      <span className="text-ink-muted text-xs flex-none">—</span>
                      <input
                        type="number"
                        min={minPrice}
                        max={DEFAULT_MAX_PRICE}
                        step={100_000}
                        value={maxPrice < DEFAULT_MAX_PRICE ? maxPrice : ''}
                        onChange={(e) => handleMaxPriceChange(e.target.value === '' ? DEFAULT_MAX_PRICE : Math.max(Number(e.target.value), minPrice))}
                        placeholder="Đến"
                        className="w-full bg-canvas-elevated border border-bdr rounded-tb-input py-1.5 px-2 text-ink-pri text-xs font-mono placeholder:text-ink-muted outline-none focus:border-accent-amber/50 transition-colors"
                      />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={DEFAULT_MAX_PRICE}
                      step={500_000}
                      value={maxPrice}
                      onChange={(e) => handleMaxPriceChange(Math.max(Number(e.target.value), minPrice))}
                      className="w-full accent-amber-500"
                    />
                    <div className="flex justify-between text-[10px] text-ink-muted font-mono mt-1">
                      <span>{minPrice > 0 ? `${minPrice.toLocaleString('vi-VN')}₫` : '0₫'}</span>
                      <span>{maxPrice < DEFAULT_MAX_PRICE ? `${maxPrice.toLocaleString('vi-VN')}₫` : 'Không giới hạn'}</span>
                    </div>
                  </div>

                  {/* Clear all */}
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-4 w-full py-2 rounded-tb-ghost border border-bdr text-ink-sec text-xs font-body hover:bg-canvas-elevated hover:text-ink-pri transition-colors cursor-pointer bg-transparent"
                    >
                      Xoá tất cả bộ lọc
                    </button>
                  )}
                </div>
              )}
            </div>
          </aside>

          {/* Main grid */}
          <div>
            {error && (
              <div className="mb-4 px-4 py-3 rounded-tb-ghost bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm font-body">
                {(error as { message?: string }).message ?? 'Không thể tải sản phẩm. Vui lòng thử lại.'}
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <PackageX size={48} className="text-ink-muted" />
                <div>
                  <p className="font-display font-bold text-lg text-ink-pri m-0">
                    Không tìm thấy sản phẩm
                  </p>
                  <p className="text-sm text-ink-muted mt-1 m-0">
                    Thử bỏ bớt bộ lọc hoặc từ khoá khác.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2 rounded-tb-ghost border border-bdr text-ink-sec text-sm font-body hover:bg-canvas-elevated hover:text-ink-pri transition-colors cursor-pointer bg-transparent"
                >
                  Xoá bộ lọc
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            )}

            {/* Pagination */}
            {!isLoading && products.length > 0 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                hasNext={hasNext}
                onPageChange={setPage}
                className="mt-6 pt-4 border-t border-bdr"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
