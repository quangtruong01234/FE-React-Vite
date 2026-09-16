import { useEffect, useRef, useState, type ReactElement, type KeyboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/format/utils';
import { Avatar } from '@/components/shared/Avatar';
import { PriceText } from '@/components/shared/PriceText';
import { ProductThumb } from '@/components/shared/ProductThumb';
import { useDebouncedValue } from '@/hooks/ui/useDebouncedValue';
import { useResetOnChange } from '@/hooks/ui/useResetOnChange';
import { useSearchSuggestions } from './useSearchSuggestions';
import { GROUP_LABELS, type Suggestion } from './searchSuggestions';

const DEBOUNCE_MS = 300;
const ROW = 'w-full flex items-center gap-3 px-2.5 py-2 rounded-tb-input text-left bg-transparent border-0 cursor-pointer transition-colors';

function SuggestionRow({ item }: { item: Suggestion }): ReactElement {
  if (item.kind === 'product') {
    return (
      <>
        <ProductThumb
          src={item.imageUrl}
          alt={item.label}
          className="w-10 h-10 rounded-lg"
          iconSize={16}
          width={96}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium text-ink-pri truncate">{item.label}</span>
          <PriceText price={item.price} className="text-[13px]" />
        </span>
      </>
    );
  }
  if (item.kind === 'seller') {
    return (
      <>
        <Avatar src={item.avatar ?? undefined} alt={item.label} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium text-ink-pri truncate">{item.label}</span>
          {item.username && (
            <span className="block text-[11px] text-ink-muted truncate">@{item.username}</span>
          )}
        </span>
      </>
    );
  }
  return (
    <>
      <Avatar src={item.avatar ?? undefined} alt={item.author} size={36} />
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] text-ink-pri line-clamp-2">{item.label}</span>
        <span className="block text-[11px] text-ink-muted truncate">{item.author}</span>
      </span>
    </>
  );
}

/**
 * Header search box with a grouped suggestion dropdown (sản phẩm · seller ·
 * bài viết). Enter with no row highlighted keeps the original behaviour — the
 * marketplace product search — so the box never got narrower than it was.
 */
export function HeaderSearch(): ReactElement {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('search') ?? '');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS);
  const { suggestions, isLoading, isError, enabled } = useSearchSuggestions(debouncedQuery);

  // A new result set invalidates the old cursor position; adjusting during
  // render keeps a stale highlight from ever being painted.
  useResetOnChange(suggestions, () => setActiveIndex(-1));

  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function goToMarketplace(): void {
    setOpen(false);
    void navigate(`/marketplace?search=${encodeURIComponent(query.trim())}`);
  }

  function pick(item: Suggestion): void {
    setOpen(false);
    setActiveIndex(-1);
    void navigate(item.to);
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    goToMarketplace();
  }

  function move(delta: number): void {
    if (suggestions.length === 0) return;
    setOpen(true);
    setActiveIndex((i) => {
      const next = i + delta;
      if (next < 0) return suggestions.length - 1;
      if (next >= suggestions.length) return 0;
      return next;
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    } else if (e.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
      // Only steal Enter when a row is highlighted — otherwise the form submits
      // and the marketplace search runs as before.
      e.preventDefault();
      pick(suggestions[activeIndex]);
    }
  }

  const showPanel = open && enabled;

  return (
    <div ref={containerRef} className="relative hidden md:block flex-1 max-w-[520px]">
      <form onSubmit={handleSubmit}>
        <button
          type="submit"
          aria-label="Tìm kiếm"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 bg-transparent border-0 p-0 cursor-pointer z-10"
        >
          <Search size={18} className="text-ink-muted pointer-events-none shrink-0" />
        </button>
        <input
          type="text"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="header-search-suggestions"
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `header-search-option-${activeIndex}` : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Tìm sản phẩm, bài viết, seller…"
          className="w-full bg-canvas-elevated border border-bdr rounded-tb-input py-3 pl-11 pr-4 text-ink-pri font-body text-[15px] placeholder:text-ink-muted outline-none focus:border-tb-amber/50 transition-colors"
        />
      </form>

      {showPanel && (
        <div
          id="header-search-suggestions"
          role="listbox"
          aria-label="Gợi ý tìm kiếm"
          className="absolute left-0 right-0 top-[calc(100%+8px)] bg-canvas-surface border border-bdr rounded-tb-card shadow-tb-card z-[120] p-1.5 max-h-[70vh] overflow-y-auto"
        >
          {isLoading && suggestions.length === 0 && (
            <p className="px-2.5 py-3 text-xs text-ink-muted">Đang tìm…</p>
          )}
          {!isLoading && isError && suggestions.length === 0 && (
            <p className="px-2.5 py-3 text-xs text-accent-red">Không tải được gợi ý.</p>
          )}
          {!isLoading && !isError && suggestions.length === 0 && (
            <p className="px-2.5 py-3 text-xs text-ink-muted">Không có gợi ý nào khớp.</p>
          )}

          {suggestions.map((item, i) => (
            <div key={`${item.kind}-${item.id}`} role="presentation">
              {(i === 0 || suggestions[i - 1].kind !== item.kind) && (
                <div className="px-2.5 pt-2 pb-1 font-display font-bold text-[11px] uppercase tracking-wide text-ink-muted">
                  {GROUP_LABELS[item.kind]}
                </div>
              )}
              <button
                type="button"
                id={`header-search-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => pick(item)}
                className={cn(ROW, i === activeIndex && 'bg-canvas-elevated')}
              >
                <SuggestionRow item={item} />
              </button>
            </div>
          ))}

          <div className="h-px bg-bdr my-1.5" />
          <button
            type="button"
            onClick={goToMarketplace}
            className={cn(ROW, 'hover:bg-canvas-elevated text-[13px] text-ink-sec')}
          >
            <ArrowRight size={15} className="shrink-0 text-accent-amber" />
            <span className="truncate">Xem tất cả sản phẩm cho “{debouncedQuery}”</span>
          </button>
        </div>
      )}
    </div>
  );
}
