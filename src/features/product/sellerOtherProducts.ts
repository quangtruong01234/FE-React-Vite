import type { ProductWithInventory } from '@/types';

/** Cards shown in the "other products from this shop" strip under a product. */
export const SHOP_OTHER_PRODUCTS_MAX = 6;

/**
 * The seller's other products, minus the one being viewed, capped at `max`.
 * The list request asks for `max + 1` so dropping the current product still
 * leaves a full row.
 */
export function otherShopProducts(
  products: ProductWithInventory[] | undefined,
  currentProductId: string,
  max: number = SHOP_OTHER_PRODUCTS_MAX,
): ProductWithInventory[] {
  return (products ?? []).filter((p) => p.id !== currentProductId).slice(0, max);
}
