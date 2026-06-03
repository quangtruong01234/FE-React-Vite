import { useState, useEffect, type ReactElement } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, PackageX, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/api';
import { queryKeys } from '@/hooks/queryKeys';
import { useProducts } from './useProducts';
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
          <Skeleton className="w-9 h-9 bg-canvas-elevated rounded-tb-input" />
        </div>
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
  const [categoryId, setCategoryId] = useState<number>(0);
  const [brandId, setBrandId] = useState<number>(0);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(30_000_000);
  const [sort, setSort] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);

  const sortParams = sortToParams(sort);
  const params: ProductParams = {
    page,
    limit: 12,
    ...sortParams,
    ...(search ? { search } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(brandId ? { brandId } : {}),
    ...(minPrice > 0 ? { minPrice } : {}),
    maxPrice,
  };

  const { data, isLoading, error } = useProducts(params);
  const products = data?.data ?? [];
  const hasNext = data?.hasNext ?? false;

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

  function handleCategoryChange(id: number): void {
    setCategoryId(id);
    setPage(1);
  }

  function handleBrandChange(id: number): void {
    setBrandId(id);
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
    setCategoryId(0);
    setBrandId(0);
    setMinPrice(0);
    setMaxPrice(30_000_000);
    setSort('newest');
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-canvas-base">
      <div className="max-w-[1080px] mx-auto px-6 py-6">
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

        <div className="grid lg:grid-cols-[230px_1fr] gap-6 items-start">
          {/* Sidebar */}
          <aside className="hidden lg:flex flex-col gap-4 sticky top-[76px]">
            <div className="bg-canvas-surface border border-bdr rounded-tb-card p-4">
              <h3 className="font-display font-bold uppercase tracking-wide text-sm text-ink-pri m-0 mb-3 flex items-center gap-2">
                <SlidersHorizontal size={15} className="text-accent-amber" />
                Bộ lọc
              </h3>

              {/* Search (desktop) */}
              <form onSubmit={handleSearchSubmit} className="mb-4">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm sản phẩm…"
                  className="w-full bg-canvas-elevated border border-bdr rounded-tb-input py-2 px-3 text-ink-pri text-xs font-body placeholder:text-ink-muted outline-none focus:border-accent-amber/50 transition-colors"
                />
              </form>

              {/* Category */}
              <div className="mb-4">
                <div className="text-xs font-body font-semibold text-ink-sec uppercase tracking-wide mb-2">
                  Danh mục
                </div>
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleCategoryChange(0)}
                    className={cn(
                      'text-left text-sm px-2.5 py-1.5 rounded-tb-ghost cursor-pointer bg-transparent border-0 transition-colors font-body',
                      categoryId === 0 ? 'bg-canvas-elevated text-accent-amber font-semibold' : 'text-ink-pri hover:bg-canvas-elevated',
                    )}
                  >
                    Tất cả
                  </button>
                  {categories.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleCategoryChange(c.id)}
                      className={cn(
                        'text-left text-sm px-2.5 py-1.5 rounded-tb-ghost cursor-pointer bg-transparent border-0 transition-colors font-body',
                        categoryId === c.id ? 'bg-canvas-elevated text-accent-amber font-semibold' : 'text-ink-pri hover:bg-canvas-elevated',
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand */}
              <div className="mb-4">
                <div className="text-xs font-body font-semibold text-ink-sec uppercase tracking-wide mb-2">
                  Thương hiệu
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleBrandChange(0)}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-colors font-body',
                      brandId === 0
                        ? 'bg-tb-gradient border-transparent text-ink-pri'
                        : 'bg-canvas-elevated border-bdr text-ink-sec hover:border-ink-muted',
                    )}
                  >
                    Tất cả
                  </button>
                  {brands.map(b => (
                    <button
                      key={b.id}
                      onClick={() => handleBrandChange(b.id)}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-colors font-body',
                        brandId === b.id
                          ? 'bg-tb-gradient border-transparent text-ink-pri'
                          : 'bg-canvas-elevated border-bdr text-ink-sec hover:border-ink-muted',
                      )}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>

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
                    value={minPrice}
                    onChange={(e) => handleMinPriceChange(Math.min(Number(e.target.value), maxPrice))}
                    placeholder="Từ"
                    className="w-full bg-canvas-elevated border border-bdr rounded-tb-input py-1.5 px-2 text-ink-pri text-xs font-mono placeholder:text-ink-muted outline-none focus:border-accent-amber/50 transition-colors"
                  />
                  <span className="text-ink-muted text-xs flex-none">—</span>
                  <input
                    type="number"
                    min={minPrice}
                    max={30_000_000}
                    step={100_000}
                    value={maxPrice}
                    onChange={(e) => handleMaxPriceChange(Math.max(Number(e.target.value), minPrice))}
                    placeholder="Đến"
                    className="w-full bg-canvas-elevated border border-bdr rounded-tb-input py-1.5 px-2 text-ink-pri text-xs font-mono placeholder:text-ink-muted outline-none focus:border-accent-amber/50 transition-colors"
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={30_000_000}
                  step={500_000}
                  value={maxPrice}
                  onChange={(e) => handleMaxPriceChange(Math.max(Number(e.target.value), minPrice))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-ink-muted font-mono mt-1">
                  <span>{minPrice > 0 ? `${minPrice.toLocaleString('vi-VN')}₫` : '0₫'}</span>
                  <span>{maxPrice.toLocaleString('vi-VN')}₫</span>
                </div>
              </div>
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => <CardSkeleton key={i} />)}
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
                  onClick={clearFilters}
                  className="px-4 py-2 rounded-tb-ghost border border-bdr text-ink-sec text-sm font-body hover:bg-canvas-elevated hover:text-ink-pri transition-colors cursor-pointer bg-transparent"
                >
                  Xoá bộ lọc
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            )}

            {/* Pagination */}
            {!isLoading && products.length > 0 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-bdr">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-tb-ghost border text-sm font-body font-medium transition-colors',
                    page <= 1
                      ? 'border-bdr text-ink-muted cursor-not-allowed opacity-50'
                      : 'border-bdr text-ink-sec hover:bg-canvas-elevated hover:text-ink-pri cursor-pointer bg-transparent',
                  )}
                >
                  <ChevronLeft size={15} /> Previous
                </button>
                <span className="text-xs text-ink-muted font-body">Trang {page}</span>
                <button
                  disabled={!hasNext}
                  onClick={() => setPage(p => p + 1)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-tb-ghost border text-sm font-body font-medium transition-colors',
                    !hasNext
                      ? 'border-bdr text-ink-muted cursor-not-allowed opacity-50'
                      : 'border-bdr text-ink-sec hover:bg-canvas-elevated hover:text-ink-pri cursor-pointer bg-transparent',
                  )}
                >
                  Next <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
