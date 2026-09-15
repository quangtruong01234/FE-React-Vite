import {
  CHART_FONT_BODY,
  CHART_GRID,
  CHART_INK_PRI,
  CHART_INK_SEC,
  CHART_SURFACE,
  withAlpha,
} from './chartTheme';

/**
 * Shared visual options so every chart in the app reads as one system. Spread
 * these into a chart's own options rather than restating the values — the
 * literals they wrap live in `chartTheme.ts`.
 */

/** Tooltip chrome: elevated surface, 1px border, token text colours. */
export const CHART_TOOLTIP_STYLE = {
  backgroundColor: CHART_SURFACE,
  borderColor: CHART_GRID,
  borderWidth: 1,
  titleColor: CHART_INK_PRI,
  bodyColor: CHART_INK_SEC,
  padding: 10,
  cornerRadius: 8,
  boxPadding: 4,
  usePointStyle: true,
  titleFont: { family: CHART_FONT_BODY, size: 12, weight: 600 },
  bodyFont: { family: CHART_FONT_BODY, size: 12 },
} as const;

/** Tick label styling shared by every axis. */
export const CHART_TICK_FONT = {
  family: CHART_FONT_BODY,
  size: 11,
} as const;

/**
 * Build a vertical gradient for an area fill.
 *
 * Chart.js resolves `backgroundColor` before it knows the plot height on the
 * very first frame, so callers must tolerate a null `chartArea` and fall back
 * to a flat colour — otherwise the fill silently disappears on initial render.
 */
export function verticalFillGradient(
  ctx: CanvasRenderingContext2D,
  area: { top: number; bottom: number } | null | undefined,
  color: string,
  topAlpha = 0.35,
): string | CanvasGradient {
  if (!area || area.bottom <= area.top) return withAlpha(color, topAlpha / 2);
  const gradient = ctx.createLinearGradient(0, area.top, 0, area.bottom);
  gradient.addColorStop(0, withAlpha(color, topAlpha));
  gradient.addColorStop(1, withAlpha(color, 0));
  return gradient;
}

/**
 * Point radius for a trend line.
 *
 * A line segment needs two points. With a single period the chart draws axes
 * and nothing else — the card reads as "broken" while the data is fine — so the
 * lone point has to be marked. Beyond that, hidden points: a dot per day is
 * noise over a 90-day range, and the hover target exists either way.
 */
export function trendPointRadius(pointCount: number, compact: boolean): number {
  if (compact) return 0;
  return pointCount <= 1 ? 4 : 0;
}

/**
 * Shorten a long category label so it cannot shove the plot area off the card.
 * Returns the original when it already fits — no ellipsis on a short label.
 */
export function truncateLabel(label: string, max = 18): string {
  const trimmed = label.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}
