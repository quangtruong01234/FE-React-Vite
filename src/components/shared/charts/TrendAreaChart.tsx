import { useMemo, type ReactElement } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartOptions, ScriptableContext } from 'chart.js';
import '@/lib/chart/chartSetup';
import {
  CHART_TICK_FONT,
  chartTooltipStyle,
  trendPointRadius,
  truncateLabel,
  verticalFillGradient,
} from '@/lib/chart/chartOptions';
import type { ChartColor } from '@/lib/chart/chartTheme';
import { useChartPalette } from './useChartPalette';

export interface TrendSeries {
  id: string;
  label: string;
  color: ChartColor;
  values: number[];
  /** Formats the value in the tooltip and, for the owning axis, its ticks. */
  formatter?: (value: number) => string;
  /** Filled area (default) or a plain line. */
  fill?: boolean;
  /** Plot against the right-hand axis — for a second unit (e.g. order count). */
  axis?: 'left' | 'right';
}

interface TrendAreaChartProps {
  labels: string[];
  series: TrendSeries[];
  /** Accessible description of the plot for screen readers. */
  ariaLabel: string;
  /** Hide axes and points for a compact sparkline. */
  compact?: boolean;
}

/**
 * Time-series line/area chart — revenue over time, and the compact sparkline
 * variant used on overview pages.
 *
 * The x axis is a `category` scale over pre-formatted period labels, not a time
 * scale: the backend already formats `RevenuePoint.period`, so adding a time
 * scale would mean pulling in `chartjs-adapter-date-fns` + `date-fns` to parse
 * strings we would only re-format back.
 */
export function TrendAreaChart({
  labels,
  series,
  ariaLabel,
  compact = false,
}: TrendAreaChartProps): ReactElement {
  const hasRightAxis = series.some((s) => s.axis === 'right');
  const palette = useChartPalette();

  // Chart.js treats a fresh `data` object as a full dataset swap and replays the
  // animation, so these must stay referentially stable across unrelated renders.
  const data = useMemo(
    () => ({
      labels,
      datasets: series.map((s) => {
        const filled = s.fill ?? true;
        const color = palette.series[s.color];
        return {
          label: s.label,
          data: s.values,
          yAxisID: s.axis === 'right' ? 'yRight' : 'y',
          borderColor: color,
          borderWidth: 2,
          fill: filled,
          backgroundColor: (ctx: ScriptableContext<'line'>) =>
            filled
              ? verticalFillGradient(ctx.chart.ctx, ctx.chart.chartArea, color)
              : 'transparent',
          tension: 0.35,
          pointRadius: trendPointRadius(s.values.length, compact),
          pointHoverRadius: compact ? 0 : 4,
          pointBackgroundColor: color,
          pointBorderColor: palette.surface,
          pointBorderWidth: 2,
        };
      }),
    }),
    [labels, series, compact, palette],
  );

  const options = useMemo<ChartOptions<'line'>>(() => {
    const formatterFor = (axis: 'left' | 'right'): ((v: number) => string) => {
      const owner = series.find((s) => (s.axis ?? 'left') === axis);
      return owner?.formatter ?? ((v: number) => String(v));
    };

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        tooltip: {
          ...chartTooltipStyle(palette),
          callbacks: {
            label: (ctx) => {
              // A gap in the series parses to `null` — drop the row rather than
              // printing "Doanh thu: null".
              const y = ctx.parsed.y;
              if (y === null) return undefined;
              const s = series[ctx.datasetIndex];
              const format = s?.formatter ?? ((v: number) => String(v));
              return ` ${s?.label ?? ''}: ${format(y)}`;
            },
          },
        },
      },
      scales: {
        x: {
          display: !compact,
          grid: { display: false },
          border: { color: palette.grid },
          ticks: {
            color: palette.inkSec,
            font: CHART_TICK_FONT,
            maxRotation: 0,
            autoSkipPadding: 16,
            callback(value) {
              // Chart.js hands the tick INDEX for a category scale, not the label.
              const raw = this.getLabelForValue(Number(value));
              return truncateLabel(String(raw), 10);
            },
          },
        },
        y: {
          display: !compact,
          beginAtZero: true,
          grid: { color: palette.grid },
          border: { display: false },
          ticks: {
            color: palette.inkSec,
            font: CHART_TICK_FONT,
            maxTicksLimit: 5,
            callback: (value) => formatterFor('left')(Number(value)),
          },
        },
        ...(hasRightAxis
          ? {
              yRight: {
                display: !compact,
                position: 'right' as const,
                beginAtZero: true,
                // Only one axis may paint gridlines, else they cross-hatch.
                grid: { drawOnChartArea: false },
                border: { display: false },
                ticks: {
                  color: palette.inkSec,
                  font: CHART_TICK_FONT,
                  maxTicksLimit: 5,
                  callback: (value: string | number) => formatterFor('right')(Number(value)),
                },
              },
            }
          : {}),
      },
    };
  }, [series, compact, hasRightAxis, palette]);

  return <Line data={data} options={options} aria-label={ariaLabel} role="img" />;
}
