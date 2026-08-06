import { type ReactElement, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/format/utils';

interface FetchingOverlayProps {
  /** Pass `isFetching && !isLoading` — background refetch only, never first load. */
  fetching: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Page-transition feedback for paginated lists using `keepPreviousData`:
 * keeps the previous page rendered (no layout jump), dims it and centers a
 * spinner while the next page loads. First load should keep showing the
 * page's skeleton — hence `isFetching && !isLoading`.
 */
export function FetchingOverlay({ fetching, children, className }: FetchingOverlayProps): ReactElement {
  return (
    <div className={cn('relative', className)}>
      <div className={cn('transition-opacity duration-200', fetching && 'opacity-40 pointer-events-none')}>
        {children}
      </div>
      {fetching && (
        <div className="absolute inset-0 grid place-items-center">
          <Loader2 size={28} className="animate-spin text-accent-amber shrink-0" />
        </div>
      )}
    </div>
  );
}
