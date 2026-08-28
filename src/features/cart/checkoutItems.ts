import type { CreateOrderItemDto, ProductWithInventory } from '@/types';

/** Minimal cart-line shape needed to build order items / check stock. */
export interface CheckoutCartLine {
  productId: string;
  skuId?: number | null;
  quantity: number;
}

/**
 * Order-item DTOs from cart lines + the resolved product map. `skuId` is only
 * included when the line actually carries one — the backend treats a present
 * key as a SKU order and validates against SKU stock.
 */
export function buildOrderItems(
  lines: CheckoutCartLine[],
  productMap: Map<string, ProductWithInventory>,
): CreateOrderItemDto[] {
  return lines.map((line) => {
    const product = productMap.get(line.productId);
    return {
      productId: line.productId,
      productName: product?.name ?? '',
      quantity: line.quantity,
      ...(line.skuId != null ? { skuId: line.skuId } : {}),
    };
  });
}

/**
 * Name to show for a cart line whose product is missing from the hydration
 * response. Absence only means "deleted" when the lookup itself **succeeded**:
 * BATCH-FAIL-01 (2026-08-27) is precisely the case where it did not — the
 * gateway used to flatten a product-service outage into an empty `200`, and
 * after that fix answers `502`. Either way, telling a shopper every line in
 * their cart no longer exists is a false claim about their own data, and it is
 * the one that makes them re-add items that were never gone.
 */
export function cartLineName(
  product: Pick<ProductWithInventory, 'name'> | undefined,
  lookupFailed: boolean,
): string {
  if (product) return product.name;
  return lookupFailed ? 'Chưa tải được tên sản phẩm' : 'Sản phẩm không còn tồn tại';
}

/**
 * Pre-submit stock check: per product, the user-facing shortage message when a
 * line asks for more than is available. Availability comes from the matched
 * SKU's `stockQuantity` when the line carries a `skuId` (and the product has
 * SKUs), otherwise from shop-level `inventory.availableStock`. A product
 * missing from the fresh fetch counts as 0 available.
 */
export function findStockShortages(
  lines: CheckoutCartLine[],
  products: ProductWithInventory[],
): Record<string, string> {
  const byId = new Map<string, ProductWithInventory>();
  for (const product of products) byId.set(product.id, product);

  const shortages: Record<string, string> = {};
  for (const line of lines) {
    const product = byId.get(line.productId);
    let available = 0;
    if (line.skuId != null && product?.skus?.length) {
      const sku = product.skus.find((s) => Number(s.id) === line.skuId);
      available = sku?.stockQuantity ?? 0;
    } else {
      available = product?.inventory?.availableStock ?? 0;
    }
    if (line.quantity > available) {
      shortages[line.productId] = `Chỉ còn ${available} sản phẩm`;
    }
  }
  return shortages;
}
