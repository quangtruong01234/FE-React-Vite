import type { OrderStatus } from '@/types';

/**
 * The ONLY file in `src/` allowed to hold chart hex literals.
 *
 * Chart.js paints into a `<canvas>`, so Tailwind utility classes cannot reach a
 * bar, an arc or a gridline — a colour has to arrive as a string. Rather than
 * scatter those strings across every dashboard (the AN-01(c) backlog item), all
 * of them live here and every chart reads from this module. When a design token
 * changes in `tailwind.config.js`, this file is the single place to mirror it.
 *
 * Each constant is annotated with the `tb-*` / semantic token it mirrors so the
 * pairing stays checkable by hand.
 */

/** `bg-canvas-elevated` / `bg-tb-elevated` — tooltip and legend surfaces. */
export const CHART_SURFACE = '#1C1C1E';
/** `border-bdr` / `border-tb-border` — gridlines and tooltip borders. */
export const CHART_GRID = '#27272A';
/** `text-ink-pri` — tooltip titles, emphasised values. */
export const CHART_INK_PRI = '#FFFFFF';
/** `text-ink-sec` / `text-tb-secondary` — axis ticks, legend labels. */
export const CHART_INK_SEC = '#A1A1AA';
/** `text-ink-muted` / `text-tb-muted` — de-emphasised series. */
export const CHART_INK_MUTED = '#52525B';

/** `text-accent-amber` / `accent-pri`. */
export const CHART_AMBER = '#F59E0B';
/** `text-accent-red` / `accent-sec`. */
export const CHART_RED = '#EF4444';
/** `text-accent-green`. */
export const CHART_GREEN = '#10B981';
/** `text-accent-cyan`. */
export const CHART_CYAN = '#06B6D4';
/** `text-accent-violet` — alias-only token. */
export const CHART_VIOLET = '#8B5CF6';
/** `text-accent-blue` — alias-only token. */
export const CHART_BLUE = '#3B82F6';

/** Tailwind `font-body` (DM Sans) — matches `tailwind.config.js` `fontFamily.body`. */
export const CHART_FONT_BODY = '"DM Sans", sans-serif';

/**
 * Per-status arc/bar colour, mirroring the badge tokens in
 * `lib/domain/orderStatus.ts` so a chart legend and a `<StatusBadge>` never
 * disagree about what colour "Đang giao" is.
 */
export const ORDER_STATUS_CHART_COLOR: Record<OrderStatus, string> = {
  pending: CHART_AMBER,
  confirmed: CHART_CYAN,
  processing: CHART_VIOLET,
  shipped: CHART_BLUE,
  delivering: CHART_BLUE,
  completed: CHART_GREEN,
  canceled: CHART_RED,
  return_requested: CHART_AMBER,
  refunded: CHART_VIOLET,
};

/**
 * Fallback sequence for categorical series that carry no domain colour of their
 * own (top products, stock rows). Ordered so neighbouring slices stay
 * distinguishable rather than shading into each other.
 */
export const CHART_CATEGORICAL_PALETTE: readonly string[] = [
  CHART_AMBER,
  CHART_VIOLET,
  CHART_CYAN,
  CHART_GREEN,
  CHART_BLUE,
  CHART_RED,
];

/** Pick a palette colour by index, wrapping when a series outruns the palette. */
export function categoricalColor(index: number): string {
  const palette = CHART_CATEGORICAL_PALETTE;
  // Guard against a negative index from an unexpected caller: JS `%` keeps the
  // sign, which would index out of bounds and hand Chart.js `undefined`.
  const safe = ((index % palette.length) + palette.length) % palette.length;
  return palette[safe] ?? CHART_AMBER;
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
