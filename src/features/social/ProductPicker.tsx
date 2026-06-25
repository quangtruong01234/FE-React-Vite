import { useState } from 'react';
import { Search, Tag, X, Loader2 } from 'lucide-react';
import { IconButton } from '@/components/shared/IconButton';
import { ProductThumb } from '@/components/shared/ProductThumb';
import { PriceText } from '@/components/shared/PriceText';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useProducts } from '../product/useProducts';
import type { ProductWithInventory } from '@/types';

interface ProductPickerProps {
  value: ProductWithInventory | null;
  onChange: (product: ProductWithInventory | null) => void;
}

/** Lets the composer attach a single product to a post (P1-03). */
export function ProductPicker({ value, onChange }: ProductPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search.trim(), 350);

  const { data, isFetching } = useProducts(
    { search: debounced, limit: 6 },
    { enabled: open && debounced.length > 0 },
  );
  const results = data?.data ?? [];

  function select(product: ProductWithInventory): void {
    onChange(product);
    setOpen(false);
    setSearch('');
  }

  if (value) {
    return (
      <div className="flex items-center gap-3 p-2.5 bg-canvas-elevated border border-bdr rounded-tb-cta">
        <ProductThumb src={value.imageUrl} alt={value.name} className="w-11 h-11 rounded-lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-display font-bold uppercase tracking-wider text-accent-amber">
            <Tag size={11} className="shrink-0" /> Sản phẩm gắn kèm
          </div>
          <p className="text-sm font-semibold text-ink-pri truncate">{value.name}</p>
          <PriceText price={value.price} size="sm" />
        </div>
        <IconButton
          onClick={() => onChange(null)}
          aria-label="Bỏ sản phẩm gắn kèm"
          className="size-7 rounded-full text-ink-sec hover:bg-canvas-surface transition-colors shrink-0"
        >
          <X size={14} className="shrink-0" />
        </IconButton>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-tb-cta border border-dashed border-bdr text-sm font-body text-ink-sec hover:border-accent-amber/50 hover:text-accent-amber transition-colors w-fit"
      >
        <Tag size={15} className="shrink-0" /> Gắn sản phẩm
      </button>
    );
  }

  return (
    <div className="border border-bdr rounded-tb-cta bg-canvas-elevated p-2.5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 shrink-0 text-ink-muted pointer-events-none"
          />
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm sản phẩm theo tên…"
            className="w-full bg-canvas-surface border border-bdr rounded-tb-input pl-8 pr-3 py-1.5 text-sm font-body text-ink-pri placeholder:text-ink-muted outline-none focus:border-accent-amber/50"
          />
        </div>
        <IconButton
          onClick={() => { setOpen(false); setSearch(''); }}
          aria-label="Đóng tìm kiếm sản phẩm"
          className="size-7 rounded-full text-ink-sec hover:bg-canvas-surface transition-colors shrink-0"
        >
          <X size={14} className="shrink-0" />
        </IconButton>
      </div>

      {debounced.length > 0 && (
        <div className="max-h-56 overflow-y-auto flex flex-col gap-1">
          {isFetching && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-ink-muted">
              <Loader2 size={15} className="shrink-0 animate-spin" /> Đang tìm…
            </div>
          )}
          {!isFetching && results.length === 0 && (
            <p className="py-4 text-center text-sm text-ink-muted font-body">
              Không tìm thấy sản phẩm nào.
            </p>
          )}
          {!isFetching && results.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => select(product)}
              className="flex items-center gap-3 p-1.5 rounded-tb-input bg-transparent border-0 cursor-pointer hover:bg-canvas-surface transition-colors text-left"
            >
              <ProductThumb src={product.imageUrl} alt={product.name} className="w-9 h-9 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-pri truncate">{product.name}</p>
                <PriceText price={product.price} size="sm" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
