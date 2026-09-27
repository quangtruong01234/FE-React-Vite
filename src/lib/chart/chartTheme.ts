import type { OrderStatus } from '@/types';
import type { Theme } from '@/lib/theme/theme';

/**
 * The ONLY file in `src/` allowed to hold chart hex literals.
 *
 * Chart.js paints into a `<canvas>`, so Tailwind utility classes cannot reach a
 * bar, an arc or a gridline — a colour has to arrive as a string, and a CSS
 * variable does not switch it when the theme changes. So data code names a
 * colour by role (`ChartColor`), and each chart resolves that role against the
 * palette of the active theme (`useChartPalette`) at render time. Switching the
 * theme hands the chart a new palette, and it redraws.
 *
 * Every hex here mirrors a channel variable in `src/index.css` — `:root` for
 * `dark`, `[data-theme="light"]` for `light`. `chartTheme.test.ts` reads the CSS
 * and fails when the two drift, so a token change is caught rather than mirrored
 * by hand.
 */

/** A series colour by role. Data code stores this, never a hex. */
export type ChartColor = 'amber' | 'red' | 'green' | 'cyan' | 'violet' | 'blue' | 'muted';

export interface ChartPalette {
  /** `canvas-elevated` — tooltip surface, doughnut gaps, point rings. */
  surface: string;
  /** `bdr` — gridlines and tooltip borders. */
  grid: string;
  /** `ink-pri` — tooltip titles. */
  inkPri: string;
  /** `ink-sec` — axis ticks, tooltip body. */
  inkSec: string;
  /** `accent-*`, and `ink-muted` for `muted`. */
  series: Record<ChartColor, string>;
}

export const CHART_PALETTES: Record<Theme, ChartPalette> = {
  dark: {
    surface: '#1C1C1E',
    grid: '#27272A',
    inkPri: '#FFFFFF',
    inkSec: '#A1A1AA',
    series: {
      amber: '#F59E0B',
      red: '#EF4444',
      green: '#10B981',
      cyan: '#06B6D4',
      violet: '#8B5CF6',
      blue: '#3B82F6',
      muted: '#52525B',
    },
  },
  light: {
    surface: '#F4F4F5',
    grid: '#E4E4E7',
    inkPri: '#09090B',
    inkSec: '#52525B',
    series: {
      amber: '#B45309',
      red: '#B91C1C',
      green: '#047857',
      cyan: '#0E7490',
      violet: '#7C3AED',
      blue: '#2563EB',
      muted: '#6B6B73',
    },
  },
};

/**
 * The same roles as Tailwind classes, for the DOM legend dot. Written out in
 * full so Tailwind's scanner sees each class; the tokens flip with the theme on
 * their own, so the legend needs no palette.
 */
export const CHART_DOT_CLASS: Record<ChartColor, string> = {
  amber: 'bg-accent-amber',
  red: 'bg-accent-red',
  green: 'bg-accent-green',
  cyan: 'bg-accent-cyan',
  violet: 'bg-accent-violet',
  blue: 'bg-accent-blue',
  muted: 'bg-ink-muted',
};

/** Tailwind `font-body` (DM Sans) — matches `tailwind.config.js` `fontFamily.body`. */
export const CHART_FONT_BODY = '"DM Sans", sans-serif';

/**
 * Per-status arc/bar colour, mirroring the badge tokens in
 * `lib/domain/orderStatus.ts` so a chart legend and a `<StatusBadge>` never
 * disagree about what colour "Đang giao" is.
 */
export const ORDER_STATUS_CHART_COLOR: Record<OrderStatus, ChartColor> = {
  pending: 'amber',
  confirmed: 'cyan',
  processing: 'violet',
  shipped: 'blue',
  delivering: 'blue',
  completed: 'green',
  canceled: 'red',
  return_requested: 'amber',
  refunded: 'violet',
};

/**
 * Fallback sequence for categorical series that carry no domain colour of their
 * own (top products, stock rows). Ordered so neighbouring slices stay
 * distinguishable rather than shading into each other.
 */
export const CHART_CATEGORICAL_PALETTE: readonly ChartColor[] = [
  'amber',
  'violet',
  'cyan',
  'green',
  'blue',
  'red',
];

/** Pick a palette colour by index, wrapping when a series outruns the palette. */
export function categoricalColor(index: number): ChartColor {
  const palette = CHART_CATEGORICAL_PALETTE;
  // Guard against a negative index from an unexpected caller: JS `%` keeps the
  // sign, which would index out of bounds and hand Chart.js `undefined`.
  const safe = ((index % palette.length) + palette.length) % palette.length;
  return palette[safe] ?? 'amber';
}

/** Convert `#RRGGBB` to `rgba()` at `alpha` — Chart.js fills need real alpha. */
export function withAlpha(hex: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return hex;
  const int = parseInt(match[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  const clamped = Math.min(1, Math.max(0, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}
