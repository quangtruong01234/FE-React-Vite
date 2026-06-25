import type { CreateOrderItemDto } from "@/types";

/**
 * P0-04 — idempotent checkout.
 *
 * Builds a deterministic signature of *what is being ordered* (product, SKU,
 * quantity), independent of array order. The checkout page pairs this signature
 * with a random `Idempotency-Key`: the key is reused across retries while the
 * signature is unchanged (so a double-submit / network retry replays the same
 * order instead of creating a duplicate), and regenerated when the cart
 * contents change (a materially different cart is a new logical order).
 */
export function buildCheckoutSignature(
  items: Pick<CreateOrderItemDto, "productId" | "quantity" | "skuId">[],
): string {
  return items
    .map((i) => `${i.productId}:${i.skuId ?? "x"}:${i.quantity}`)
    .sort()
    .join("|");
}

/** Returns the existing key when the signature matches, otherwise a fresh key. */
export function resolveIdempotencyKey(
  current: { signature: string; key: string } | null,
  signature: string,
  generateKey: () => string,
): { signature: string; key: string } {
  if (current && current.signature === signature) return current;
  return { signature, key: generateKey() };
}
