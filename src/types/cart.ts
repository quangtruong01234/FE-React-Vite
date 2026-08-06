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
  cartId: number;
  productId: string;
  skuId: number | null;
  skuTierIdx: string | null;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServerCart {
  id: number;
  userId: string;
  items: ServerCartItem[];
  createdAt: string;
}

export interface AddToCartDto {
  productId: string;
  quantity: number;
  skuId?: number;
}

export interface UpdateCartItemDto {
  quantity: number;
}
