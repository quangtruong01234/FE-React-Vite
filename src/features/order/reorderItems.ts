import type { AddToCartDto, OrderItem, ProductWithInventory } from '@/types';
import { cartAddRefusal } from '@/features/cart/addToCartError';

/** Why an order line could not go back into the cart. */
export type ReorderSkipReason = 'deleted' | 'unavailable' | 'outOfStock' | 'failed';

export interface ReorderSkip {
  item: OrderItem;
  reason: ReorderSkipReason;
}

export interface ReorderPlan {
  /** Cart adds, in order-item order; quantity capped at what is in stock now. */
  lines: AddToCartDto[];
  skipped: ReorderSkip[];
}

/**
 * Why a cart add the plan let through was still refused. The pre-filter reads
 * stock a moment earlier, so the CART-STOCK-01 409 can still land on a line.
 */
export function reorderAddFailureReason(error: unknown): ReorderSkipReason {
  const refusal = cartAddRefusal(error);
  if (refusal === 'inactive') return 'unavailable';
  if (refusal === 'outOfStock') return 'outOfStock';
  return 'failed';
}

/** Product ids worth looking up — a deleted product has no id left. */
export function reorderProductIds(items: OrderItem[]): string[] {
  return [...new Set(items.flatMap((i) => (i.productId ? [i.productId] : [])))];
}

/**
 * F10 "Mua lại" — which lines of a past order can be re-added, checked against
 * the products as they are now. `POST /cart` validates neither stock nor
 * `isActive`, so without this the cart would happily take a line checkout then
 * refuses.
 *
 * `products` must come from a lookup that **succeeded**: absence from it is
 * read as "deleted".
 */
export function planReorder(
  items: OrderItem[],
  products: Map<string, ProductWithInventory>,
): ReorderPlan {
  const lines: AddToCartDto[] = [];
  const skipped: ReorderSkip[] = [];

  for (const item of items) {
    const product = item.productId ? products.get(item.productId) : undefined;
    if (!item.productId || !product) {
      skipped.push({ item, reason: 'deleted' });
      continue;
    }
    if (product.isActive === false) {
      skipped.push({ item, reason: 'unavailable' });
      continue;
    }

    let stock: number;
    if (item.skuId != null) {
      const sku = product.skus?.find((s) => s.id === item.skuId);
      if (!sku) {
        skipped.push({ item, reason: 'unavailable' });
        continue;
      }
      stock = sku.stockQuantity;
    } else if ((product.skus?.length ?? 0) > 0) {
      // Variations were added after the purchase — the old SKU-less line no
      // longer names something the buyer can check out.
      skipped.push({ item, reason: 'unavailable' });
      continue;
    } else {
      stock = product.inventory?.availableStock ?? 0;
    }

    if (stock <= 0) {
      skipped.push({ item, reason: 'outOfStock' });
      continue;
    }
    lines.push({
      productId: product.id,
      quantity: Math.min(item.quantity, stock),
      ...(item.skuId != null ? { skuId: item.skuId } : {}),
    });
  }

  return { lines, skipped };
}
