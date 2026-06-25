/**
 * Session-safe record of an online-payment checkout that is awaiting gateway
 * confirmation.
 *
 * P0-04: the cart must NOT be consumed when we redirect to the payment gateway
 * — only after `PaymentResultPage` confirms success. We persist which cart
 * items the checkout covered so that page can remove exactly those items once
 * the gateway reports success, surviving the cross-origin redirect.
 *
 * `sessionStorage` is intentional: the gateway returns to our origin in the
 * same tab, so the record survives the round-trip but does not leak into other
 * tabs or future sessions.
 */
const KEY = 'tb_pending_checkout';

export interface PendingCheckout {
  /** Orders created for this checkout (informational / correlation). */
  orderIds: number[];
  /** Specific cart item ids to remove on success. Ignored when `clearAll`. */
  cartItemIds: number[];
  /** Whether the whole cart was checked out (clear) vs a selected subset. */
  clearAll: boolean;
}

export function setPendingCheckout(data: PendingCheckout): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable (private mode / quota) — non-fatal; cart cleanup
    // simply falls back to the user clearing it manually.
  }
}

export function getPendingCheckout(): PendingCheckout | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingCheckout;
  } catch {
    return null;
  }
}

export function clearPendingCheckout(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
