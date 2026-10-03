import type { ReactElement } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/format/utils';
import { LIST_SEARCH_MAX } from '@/api/client';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Name the searched columns ("Mã đơn hoặc địa chỉ nhận…") — the box must not promise more than the server matches. */
  placeholder: string;
  /** Accessible name; defaults to the placeholder without its trailing ellipsis. */
  label?: string;
  /** The server 400s past its limit, so the box is capped rather than the request. */
  maxLength?: number;
  /** Wrapper classes — width / margin. */
  className?: string;
}

/**
 * Server-side list search box (LIST-SEARCH-01). Pair it with `useListSearch`,
 * which debounces the value and resets the page.
 */
export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  maxLength = LIST_SEARCH_MAX,
  className,
}: SearchFieldProps): ReactElement {
  return (
    <div className={cn('relative', className)}>
      <Search size={16} className="shrink-0 absolute left-3.5 top-1/2 -translate-y-1/2 text-tb-muted pointer-events-none" />
      <input
        type="search"
        placeholder={placeholder}
        aria-label={label ?? placeholder.replace(/…$/, '')}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-tb-elevated border border-tb-border rounded-tb-input py-2.5 pl-10 pr-3.5 text-ink-pri font-body text-[13px] placeholder:text-tb-muted outline-none focus:border-tb-amber/50 transition-colors"
      />
    </div>
  );
}
