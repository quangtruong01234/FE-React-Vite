import type { ReactElement } from 'react';
import { TrendingUp } from 'lucide-react';
import type { PriceSuggestionView } from './priceSuggestion';

interface Props {
  suggestion: PriceSuggestionView | null;
  /** One-tap apply of the suggested median — advisory only, stays editable. */
  onApply: (median: number) => void;
}

/**
 * Advisory catalog price hint (AI-01) — renders nothing until the catalog has
 * enough samples for the selected category/brand/condition.
 */
export function PriceSuggestionHint({ suggestion, onApply }: Props): ReactElement | null {
  if (!suggestion) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-4 py-3 bg-accent-amber/5 border border-accent-amber/20 rounded-tb-card">
      <TrendingUp size={14} className="shrink-0 text-accent-amber" />
      <span className="text-xs font-body text-ink-sec">
        Giá phổ biến cùng danh mục:{' '}
        <span className="text-ink-pri font-medium">{suggestion.rangeLabel}</span>{' '}
        (dựa trên {suggestion.sampleSize} sản phẩm)
      </span>
      <button
        type="button"
        onClick={() => onApply(suggestion.median)}
        className="shrink-0 px-2 py-1 rounded-tb-pill bg-accent-amber/15 text-accent-amber text-xs font-body font-semibold hover:bg-accent-amber/25 transition-colors"
      >
        Dùng {suggestion.medianLabel}
      </button>
    </div>
  );
}
