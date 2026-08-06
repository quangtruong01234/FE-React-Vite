import type { ProductWithInventory, ShippingFeeItemDto } from '@/types';

/** Minimal cart-line shape needed to price + size a shipping-fee item. */
export interface ShippingFeeCartLine {
  productId: string;
  skuId?: number | null;
  quantity: number;
}

/**
 * Unit price for a cart line: the matched SKU's price when the line carries a
 * `skuId` and that SKU exists, otherwise the base product price. Backend money
 * fields can arrive as decimal strings, so coerce with `Number()`.
 */
export function effectiveUnitPrice(
  line: Pick<ShippingFeeCartLine, 'skuId'>,
  product: ProductWithInventory | undefined,
): number {
  if (line.skuId != null && product?.skus?.length) {
    const sku = product.skus.find((s) => Number(s.id) === line.skuId);
    if (sku) return Number(sku.price);
  }
  return Number(product?.price ?? 0);
}

/**
 * Build the GHN shipping-fee item list from cart lines + the resolved product
 * map. Each item carries the product's `weight` (grams) so the fee preview is
 * size-accurate; a missing or unweighed (`null`) product yields `undefined`
 * weight and the backend falls back to its default.
 */
export function buildShippingFeeItems(
  lines: ShippingFeeCartLine[],
  productMap: Map<string, ProductWithInventory>,
): ShippingFeeItemDto[] {
  return lines.map((line) => {
    const product = productMap.get(line.productId);
    return {
      productName: product?.name,
      quantity: line.quantity,
      price: effectiveUnitPrice(line, product),
      weight: product?.weight ?? undefined,
    };
  });
}
