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

/** `errorCode` on the held-key 409 (IDEM-HOLD-CODE-01) — the only 409 on this route that has one. */
const ORDER_REQUEST_IN_PROGRESS = "ORDER_REQUEST_IN_PROGRESS";

/**
 * Text of the backend `ORDER_MESSAGE.DUPLICATE_REQUEST_IN_PROGRESS` 409. Kept as a
 * fallback until the backend that sends the errorCode is live on prod — the
 * older one sends this 409 with the message only.
 */
const DUPLICATE_IN_PROGRESS = /duplicate order request is already being processed/i;

/**
 * SWEEP-1002-01 — did a failed `POST /api/order` leave the buyer NOT knowing
 * whether the order exists?
 *
 * The backend now holds the `Idempotency-Key` for 300s after a failure it
 * cannot classify, because the order may still commit after the gateway gave
 * up: a 408, any 5xx, or no HTTP answer at all (network drop, or a 2xx body
 * that never parsed). A same-key retry inside that window gets the 409 below;
 * after it, the same key can create a second order. So neither retry is safe —
 * the buyer has to check "Đơn hàng của tôi" first.
 *
 * That 409 carries `errorCode: "ORDER_REQUEST_IN_PROGRESS"`; other 409s
 * (stock, voucher) are definite rejections and carry none. An older backend
 * sends the code-less 409, so the message is still matched as a fallback.
 *
 * Definite rejections (any other 4xx) return `false`: the key was released and
 * fixing the input then retrying is safe.
 */
export function isOrderOutcomeUnknown(error: unknown): boolean {
  const status =
    error && typeof error === "object" && "status" in error
      ? (error as { status?: unknown }).status
      : undefined;
  if (typeof status !== "number") return true;
  if (status === 408 || status >= 500) return true;
  if (status !== 409) return false;
  if ((error as { errorCode?: unknown }).errorCode === ORDER_REQUEST_IN_PROGRESS) return true;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && DUPLICATE_IN_PROGRESS.test(message);
}

