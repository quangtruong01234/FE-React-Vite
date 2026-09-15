import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { cn } from '@/lib/format/utils';

interface ChartFrameProps {
  title: string;
  /** Optional context line under the title (range, unit, caveat). */
  subtitle?: string;
  /** Plot height in px. The canvas fills the box — Chart.js keeps no aspect ratio here. */
  height?: number;
  /** Renders the empty message instead of the canvas. */
  isEmpty?: boolean;
  emptyLabel?: string;
  /** Renders a skeleton instead of the canvas while the query is in flight. */
  isLoading?: boolean;
  /** Slot on the title row — a range switch, a link. */
  action?: ReactNode;
  /** Rendered beside/below the plot — typically a `<ChartLegend>`. */
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * The card shell every chart sits in: heading, fixed-height plot box, and the
 * loading / empty states.
 *
 * Charts must never render a bare canvas straight into a page — Chart.js sizes
 * itself from its parent, so without a box of known height the canvas collapses
 * to 0px (or grows unbounded as the parent reacts to it). Centralising that box
 * here is what keeps every dashboard consistent and stops the "chart invisible
 * until resize" class of bug.
 */
export function ChartFrame({
  title,
  subtitle,
  height = 260,
  isEmpty = false,
  emptyLabel = 'Chưa có dữ liệu.',
  isLoading = false,
  action,
  footer,
  className,
  children,
}: ChartFrameProps): ReactElement {
  return (
    <section
      className={cn(
        'bg-canvas-surface border border-bdr rounded-tb-card p-5',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="font-display font-semibold text-sm text-ink-pri">{title}</h2>
          {subtitle && (
            <p className="font-body text-xs text-ink-muted mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {isLoading ? (
        <div
          className="grid place-items-center rounded-tb-input bg-canvas-elevated [height:var(--h)] tb-pulse"
          style={{ '--h': `${height}px` } as CSSProperties}
        >
          <span className="font-body text-xs text-ink-muted">Đang tải biểu đồ...</span>
        </div>
      ) : isEmpty ? (
        <div
          className="grid place-items-center [height:var(--h)]"
          style={{ '--h': `${height}px` } as CSSProperties}
        >
          <p className="font-body text-sm text-ink-muted text-center px-4">{emptyLabel}</p>
        </div>
      ) : (
        <>
          {/* `relative` + a fixed height is what Chart.js needs to size itself. */}
          <div
            className="relative w-full [height:var(--h)]"
            style={{ '--h': `${height}px` } as CSSProperties}
          >
            {children}
          </div>
          {footer}
        </>
      )}
    </section>
  );
}
