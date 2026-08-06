import type { ProductSku, Variation } from '@/types';

/**
 * A SKU is structurally valid only when its tier count matches the number of
 * product variations. Backend data can contain malformed SKUs (e.g. a SKU with
 * `tierIdx: [0, 1]` on a single-variation product); those must never be matched
 * or shown as available, otherwise availability and add-to-cart disagree.
 */
export function isValidSku(sku: ProductSku, variationCount: number): boolean {
  return sku.tierIdx.length === variationCount;
}

/** Valid SKUs for a product (filters out malformed records). */
export function getValidSkus(
  skus: ProductSku[] | undefined,
  variationCount: number,
): ProductSku[] {
  return (skus ?? []).filter((s) => isValidSku(s, variationCount));
}

/**
 * The single SKU that exactly matches a complete tier selection. Returns
 * undefined unless every tier is selected and a valid SKU matches all tiers.
 * This is the one source of truth for price, max quantity and the mutation
 * payload.
 */
export function findMatchingSku(
  validSkus: ProductSku[],
  selectedTiers: Record<number, number>,
  variationCount: number,
): ProductSku | undefined {
  if (Object.keys(selectedTiers).length !== variationCount) return undefined;
  return validSkus.find((s) => s.tierIdx.every((v, i) => v === selectedTiers[i]));
}

/**
 * Total in-combination stock for one option of a tier, honouring selections
 * already made in the *other* tiers. Returns null when no valid SKU offers the
 * option (the combination does not exist → the option must be disabled before
 * the user can click it).
 */
/**
 * Initial tier selection for a product detail view: per tier, the first option
 * offered by at least one valid, in-stock SKU. A tier with no in-stock option
 * stays unselected, so malformed products (no valid SKU) return an empty
 * selection and nothing is preselected.
 */
export function defaultTierSelection(
  variations: Variation[] | undefined,
  skus: ProductSku[] | undefined,
): Record<number, number> {
  const tiers = variations ?? [];
  if (!tiers.length) return {};
  const valid = getValidSkus(skus, tiers.length);
  const defaults: Record<number, number> = {};
  tiers.forEach((variation, tier) => {
    const firstAvailable = variation.options.findIndex((_, optIdx) =>
      valid.some((s) => s.tierIdx[tier] === optIdx && s.stockQuantity > 0),
    );
    if (firstAvailable >= 0) defaults[tier] = firstAvailable;
  });
  return defaults;
}

export function getOptionStock(
  validSkus: ProductSku[],
  tier: number,
  optIdx: number,
  selectedTiers: Record<number, number>,
): number | null {
  const candidates = validSkus.filter((s) => {
    if (s.tierIdx[tier] !== optIdx) return false;
    return Object.entries(selectedTiers).every(([t, opt]) => {
      const ti = Number(t);
      return ti === tier || s.tierIdx[ti] === opt;
    });
  });
  if (candidates.length === 0) return null;
  return candidates.reduce((sum, s) => sum + s.stockQuantity, 0);
}
