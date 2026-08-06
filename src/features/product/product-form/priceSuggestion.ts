import type { PriceSuggestion, PriceSuggestionParams, ProductCondition } from '@/types';
import { formatVnd } from '@/lib/format/utils';

/**
 * Build the price-suggestion query params from the form's current selection
 * (AI-01). Returns `null` when no category is selected yet — the endpoint
 * requires `categoryId`; products carry multiple categories but the stats are
 * per-category, so the first selected one anchors the suggestion.
 */
export function buildPriceSuggestionParams(
  categoryIds: number[],
  brandId: number | null,
  condition: ProductCondition,
): PriceSuggestionParams | null {
  if (categoryIds.length === 0) return null;
  return {
    categoryId: categoryIds[0],
    ...(brandId != null ? { brandId } : {}),
    condition,
  };
}

export interface PriceSuggestionView {
  /** Typical P25–P75 range, formatted, e.g. "1.200.000 đ – 1.800.000 đ". */
  rangeLabel: string;
  /** Formatted median — the one-tap suggested value. */
  medianLabel: string;
  /** Raw median in integer VND, for applying to the price field. */
  median: number;
  sampleSize: number;
}

/**
 * Map the advisory response to what the hint renders, or `null` to hide the
 * widget entirely (no data yet, too few catalog samples, or a degenerate
 * response missing the stats the contract promises alongside
 * `sufficientData: true`).
 */
export function priceSuggestionView(
  data: PriceSuggestion | undefined,
): PriceSuggestionView | null {
  if (!data || !data.sufficientData) return null;
  const { median, p25, p75 } = data;
  if (median == null || p25 == null || p75 == null) return null;
  return {
    rangeLabel: `${formatVnd(p25)} – ${formatVnd(p75)}`,
    medianLabel: formatVnd(median),
    median,
    sampleSize: data.sampleSize,
  };
}
