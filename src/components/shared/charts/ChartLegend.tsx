import type { CSSProperties, ReactElement } from 'react';
import { cn } from '@/lib/format/utils';
import { slicePercent, sliceTotal, type ChartSlice } from '@/lib/chart/chartSeries';

interface ChartLegendProps {
  slices: readonly ChartSlice[];
  /** Append each slice's share of the total. */
  showPercent?: boolean;
  /**
   * Render each slice's value. Off for a pure series key (e.g. naming the two
   * lines of a trend chart), where the numbers live on the axes instead.
   */
  showValues?: boolean;
  /** Formats the raw value — defaults to a plain number. */
  valueFormatter?: (value: number) => string;
  /** `list` stacks one per row (side panel); `inline` wraps as chips (under a plot). */
  layout?: 'list' | 'inline';
  className?: string;
}

/**
 * The legend for every chart in the app, rendered as real DOM rather than
 * painted into the canvas by Chart.js's Legend plugin.
 *
 * Canvas legends are invisible to screen readers, unselectable, and cannot use
 * the `tb-*` tokens — so `chartSetup.ts` deliberately leaves the Legend plugin
 * unregistered and every chart passes its slices here instead.
 */
export function ChartLegend({
  slices,
  showPercent = false,
  showValues = true,
  valueFormatter = (value) => String(value),
  layout = 'list',
  className,
}: ChartLegendProps): ReactElement {
  const total = sliceTotal(slices);

  return (
    <ul
      className={cn(
        layout === 'list' ? 'space-y-2' : 'flex flex-wrap gap-x-4 gap-y-2',
        className,
      )}
    >
      {slices.map((slice) => (
        <li
          key={slice.key}
          className={cn(
            'flex items-center gap-2 font-body text-xs',
            layout === 'inline' && 'shrink-0',
          )}
        >
          {/* Runtime chart colour — the documented inline-style exception, in the
              preferred custom-property form. */}
          <span
            className="size-2.5 rounded-full shrink-0 bg-[var(--dot)]"
            style={{ '--dot': slice.color } as CSSProperties}
          />
          <span
            className={cn(
              'text-ink-sec truncate',
              layout === 'list' && 'flex-1',
            )}
          >
            {slice.label}
          </span>
          {showValues && (
            <span className="font-mono font-semibold text-ink-pri shrink-0">
              {valueFormatter(slice.value)}
            </span>
          )}
          {showPercent && (
            <span className="font-mono text-ink-muted shrink-0">
              {slicePercent(slice.value, total)}%
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
