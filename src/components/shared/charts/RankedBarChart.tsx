import { useMemo, type ReactElement } from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import '@/lib/chart/chartSetup';
import {
  CHART_TICK_FONT,
  chartTooltipStyle,
  truncateLabel,
} from '@/lib/chart/chartOptions';
import type { ChartColor } from '@/lib/chart/chartTheme';
import type { ChartSlice } from '@/lib/chart/chartSeries';
import { useChartPalette } from './useChartPalette';
import { useT } from '@/hooks/ui/useT';
import { sharedMessages } from '../shared.i18n';

interface RankedBarChartProps {
  slices: readonly ChartSlice[];
  ariaLabel: string;
  valueFormatter?: (value: number) => string;
  /** Width reserved for category labels, in px. */
  labelWidth?: number;
  /** Optional second bar per row — e.g. the minimum-stock threshold. */
  comparison?: {
    label: string;
    color: ChartColor;
    values: number[];
  };
  /** Series name for the primary bars, shown in the tooltip. */
  valueLabel?: string;
  /**
   * Extra tooltip line for the primary series, by slice index — e.g. the
   * revenue behind a "units sold" bar. Return `undefined` to add no line.
   */
  tooltipExtra?: (index: number) => string | undefined;
}

/**
 * Horizontal ranked bars — top products, lowest stock.
 *
 * Horizontal (`indexAxis: 'y'`) rather than vertical because the categories are
 * product names: vertical bars would either rotate the labels 90° or clip them.
 */
export function RankedBarChart({
  slices,
  ariaLabel,
  valueFormatter = (value) => String(value),
  labelWidth = 120,
  comparison,
  valueLabel,
  tooltipExtra,
}: RankedBarChartProps): ReactElement {
  const palette = useChartPalette();
  const t = useT(sharedMessages);

  const data = useMemo(
    () => ({
      labels: slices.map((s) => s.label),
      datasets: [
        {
          label: valueLabel ?? t('value'),
          data: slices.map((s) => s.value),
          backgroundColor: slices.map((s) => palette.series[s.color]),
          borderWidth: 0,
          borderRadius: 4,
          borderSkipped: false as const,
          barPercentage: comparison ? 0.9 : 0.7,
          categoryPercentage: 0.8,
        },
        ...(comparison
          ? [
              {
                label: comparison.label,
                data: comparison.values,
                backgroundColor: palette.series[comparison.color],
                borderWidth: 0,
                borderRadius: 4,
                borderSkipped: false as const,
                barPercentage: 0.9,
                categoryPercentage: 0.8,
              },
            ]
          : []),
      ],
    }),
    [slices, comparison, valueLabel, palette, t],
  );

  const options = useMemo<ChartOptions<'bar'>>(
    () => ({
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          ...chartTooltipStyle(palette),
          callbacks: {
            // The truncated tick label must not leak into the tooltip — show
            // the full name there, which is the point of truncating the axis.
            title: (items) => String(items[0]?.label ?? ''),
            label: (ctx) => ` ${ctx.dataset.label}: ${valueFormatter(Number(ctx.parsed.x))}`,
            afterLabel: (ctx) =>
              // Only the primary series carries the extra line.
              ctx.datasetIndex === 0 ? tooltipExtra?.(ctx.dataIndex) : undefined,
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: palette.grid },
          border: { display: false },
          ticks: {
            color: palette.inkSec,
            font: CHART_TICK_FONT,
            maxTicksLimit: 5,
            callback: (value) => valueFormatter(Number(value)),
          },
        },
        y: {
          grid: { display: false },
          border: { color: palette.grid },
          ticks: {
            color: palette.inkSec,
            font: CHART_TICK_FONT,
            autoSkip: false,
            crossAlign: 'far' as const,
            callback(value) {
              const raw = this.getLabelForValue(Number(value));
              return truncateLabel(String(raw), 18);
            },
          },
          afterFit(scale) {
            // Pin the label gutter so bars do not shift width as names change.
            scale.width = labelWidth;
          },
        },
      },
    }),
    [valueFormatter, labelWidth, tooltipExtra, palette],
  );

  return <Bar data={data} options={options} aria-label={ariaLabel} role="img" />;
}
