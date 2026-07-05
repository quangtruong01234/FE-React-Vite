import type { AddToCartDto, ServerCart, ServerCartItem } from '@/types';

/**
 * Optimistic add-to-cart cache update: merges the quantity into a matching
 * line (same product + sku) or appends a temporary negative-id item. No-ops
 * when the cart hasn't loaded yet (the settle-invalidate refetches it anyway).
 */
export function addItemToCartCache(
  old: ServerCart | null | undefined,
  data: AddToCartDto,
  now: number = Date.now(),
): ServerCart | null | undefined {
  if (!old) return old;
  const existing = old.items.find(
    i => i.productId === data.productId && i.skuId === (data.skuId ?? null),
  );
  if (existing) {
    return {
      ...old,
      items: old.items.map(i =>
        i === existing ? { ...i, quantity: i.quantity + data.quantity } : i,
      ),
    };
  }
  const optimisticItem: ServerCartItem = {
    id: -now,
    cartId: old.id,
    productId: data.productId,
    skuId: data.skuId ?? null,
    skuTierIdx: null,
    quantity: data.quantity,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
  return { ...old, items: [...old.items, optimisticItem] };
}
