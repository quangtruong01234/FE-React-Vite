// --- Cart ---

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  stockQuantity: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

export interface ServerCartItem {
  id: number;
  /**
   * `null` only on an optimistic row added while the server has no cart row yet
   * (SHAPE-01 empty cart, see `ServerCart.id`). Nothing reads this field — it
   * exists to mirror the server row — so the honest type costs nothing.
   */
  cartId: number | null;
  productId: string;
  skuId: number | null;
  skuTierIdx: string | null;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * `GET /api/cart`. Backend SHAPE-01 (2026-08-26) stopped answering `null` for a
 * user with no cart row — an empty cart is an empty cart, not the absence of
 * one. The follow-up (2026-08-27) settled the shape at exactly **five keys in
 * both states**: the empty cart spells the lazily-created row out as
 * `{ id: null, userId, createdAt: null, updatedAt: null, items: [] }` rather
 * than omitting the timestamps, so there is one key-set to read, not two.
 *
 * Typed for both shapes — the optional `?` covers production, which still
 * answers the pre-SHAPE-01 shape, and `api.cart.get()` keeps its `| null` for
 * the same reason.
 */
export interface ServerCart {
  id: number | null;
  userId: string;
  items: ServerCartItem[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AddToCartDto {
  productId: string;
  quantity: number;
  skuId?: number;
}

export interface UpdateCartItemDto {
  quantity: number;
}
