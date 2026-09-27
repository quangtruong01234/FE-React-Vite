/**
 * Backend cap on a single cart line (AUD-0925-03): `PATCH /cart/items/:id` and
 * `POST /cart` reject anything above this with a 400. Mirrors the backend's
 * `MAX_CART_LINE_QUANTITY` — the "+" stepper stops here instead of sending a
 * request that is guaranteed to fail.
 */
export const MAX_CART_LINE_QUANTITY = 999;

export function canIncreaseCartLine(quantity: number): boolean {
  return quantity < MAX_CART_LINE_QUANTITY;
}
