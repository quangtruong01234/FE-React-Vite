import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { CopyX, ExternalLink } from 'lucide-react';
import type { DuplicateWarningView } from './duplicateCheck';

interface Props {
  warning: DuplicateWarningView | null;
  /** "Continue anyway" — hides the warning; submit was never blocked. */
  onDismiss: () => void;
}

/**
 * Non-blocking duplicate-image advisory on the seller create form (AI-02F3).
 * Renders nothing until a duplicate-check flags the uploaded cover image.
 */
export function DuplicateWarningHint({ warning, onDismiss }: Props): ReactElement | null {
  if (!warning) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-4 py-3 bg-accent-amber/5 border border-accent-amber/20 rounded-tb-card">
      <CopyX size={14} className="shrink-0 text-accent-amber" />
      <span className="text-xs font-body text-ink-sec flex-1 min-w-48">{warning.message}</span>
      <Link
        to={`/product/${warning.matchedProductId}`}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-tb-pill text-xs font-body font-semibold text-ink-sec hover:text-ink-pri transition-colors"
      >
        <ExternalLink size={12} className="shrink-0" />
        Xem sản phẩm trùng
      </Link>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 px-2 py-1 rounded-tb-pill bg-accent-amber/15 text-accent-amber text-xs font-body font-semibold hover:bg-accent-amber/25 transition-colors"
      >
        Tiếp tục đăng
      </button>
    </div>
  );
}
