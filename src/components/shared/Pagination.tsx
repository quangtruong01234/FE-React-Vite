import { type ReactElement } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/format/utils';
import { getPageItems } from '@/lib/format/pagination';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Server-driven next-page guard; falls back to `page < totalPages` when omitted. */
  hasNext?: boolean;
  className?: string;
}

/**
 * Numbered pagination control (Trước / 1 … N / Sau) shared across list pages.
 * Renders nothing when there is a single page or fewer.
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  hasNext,
  className,
}: PaginationProps): ReactElement | null {
  if (totalPages <= 1) return null;

  const pageItems = getPageItems(page, totalPages);
  const canPrev = page > 1;
  const canNext = hasNext ?? page < totalPages;

  return (
    <div className={cn('flex items-center justify-center gap-1.5 flex-wrap', className)}>
      <button
        type="button"
        disabled={!canPrev}
        onClick={() => onPageChange(page - 1)}
        aria-label="Trang trước"
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-tb-ghost border text-sm font-body font-medium transition-colors',
          !canPrev
            ? 'border-bdr text-ink-muted cursor-not-allowed opacity-50'
            : 'border-bdr text-ink-sec hover:bg-canvas-elevated hover:text-ink-pri cursor-pointer bg-transparent',
        )}
      >
        <ChevronLeft size={15} className="shrink-0" />
        <span className="hidden sm:inline">Trước</span>
      </button>

      {pageItems.map(item =>
        typeof item === 'number' ? (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className={cn(
              'min-w-9 px-3 py-2 rounded-tb-ghost border text-sm font-body font-semibold transition-colors cursor-pointer',
              item === page
                ? 'bg-tb-gradient border-transparent text-ink-pri'
                : 'border-bdr text-ink-sec hover:bg-canvas-elevated hover:text-ink-pri bg-transparent',
            )}
          >
            {item}
          </button>
        ) : (
          <span
            key={item}
            className="min-w-9 px-2 py-2 text-center text-sm text-ink-muted font-body select-none"
          >
            …
          </span>
        ),
      )}

      <button
        type="button"
        disabled={!canNext}
        onClick={() => onPageChange(page + 1)}
        aria-label="Trang sau"
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-tb-ghost border text-sm font-body font-medium transition-colors',
          !canNext
            ? 'border-bdr text-ink-muted cursor-not-allowed opacity-50'
            : 'border-bdr text-ink-sec hover:bg-canvas-elevated hover:text-ink-pri cursor-pointer bg-transparent',
        )}
      >
        <span className="hidden sm:inline">Sau</span>
        <ChevronRight size={15} className="shrink-0" />
      </button>
    </div>
  );
}
