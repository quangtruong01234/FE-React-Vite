import { useMemo, type ReactElement } from 'react';
import { Doughnut } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import '@/lib/chart/chartSetup';
import { chartTooltipStyle } from '@/lib/chart/chartOptions';
import { slicePercent, sliceTotal, type ChartSlice } from '@/lib/chart/chartSeries';
import { useChartPalette } from './useChartPalette';

interface DoughnutChartProps {
  slices: readonly ChartSlice[];
  ariaLabel: string;
  /** Formats the raw value in the tooltip. */
  valueFormatter?: (value: number) => string;
  /** Big number rendered in the hole — omit for a plain ring. */
  centerValue?: string;
  centerLabel?: string;
}

/**
 * Doughnut for categorical breakdowns — order status, stock health.
 *
 * Zero-value slices are expected to be filtered out upstream (see
 * `orderStatusSlices`); Chart.js would otherwise keep a hover target for an arc
 * of no width.
 */
export function DoughnutChart({
  slices,
  ariaLabel,
  valueFormatter = (value) => String(value),
  centerValue,
  centerLabel,
}: DoughnutChartProps): ReactElement {
  const total = sliceTotal(slices);
  const palette = useChartPalette();

  const data = useMemo(
    () => ({
      labels: slices.map((s) => s.label),
      datasets: [
        {
          data: slices.map((s) => s.value),
          backgroundColor: slices.map((s) => palette.series[s.color]),
          // Matching the card surface makes the gap read as a separator rather
          // than a stray outline.
          borderColor: palette.surface,
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    }),
    [slices, palette],
  );

  const options = useMemo<ChartOptions<'doughnut'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        tooltip: {
          ...chartTooltipStyle(palette),
          callbacks: {
            label: (ctx) => {
              const value = Number(ctx.parsed);
              return ` ${valueFormatter(value)} (${slicePercent(value, total)}%)`;
            },
          },
        },
      },
    }),
    [valueFormatter, total, palette],
  );

  return (
    <div className="relative size-full">
      <Doughnut data={data} options={options} aria-label={ariaLabel} role="img" />
      {centerValue && (
        // `pointer-events-none` keeps the hole from stealing arc hovers.
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center">
            <p className="font-display font-bold text-xl text-ink-pri leading-none">
              {centerValue}
            </p>
            {centerLabel && (
              <p className="font-body text-[11px] text-ink-muted mt-1">{centerLabel}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
