import { defineMessages, plural } from '@/lib/i18n/messages';

/** CART-STOCK-01 — refusals of `POST /api/cart`, shared by every add-to-cart surface. */
export const addToCartMessages = defineMessages({
  vi: {
    inactive: 'Sản phẩm đã ngừng bán',
    outOfStock: 'Sản phẩm đã hết hàng',
    exceedsStock: 'Chỉ còn {available} sản phẩm, giỏ hàng của bạn đã có {inCart}',
    exceedsStockUnknown: 'Số lượng vượt quá số hàng còn trong kho',
    addFailed: 'Không thêm được vào giỏ hàng. Vui lòng thử lại.',
  },
  en: {
    inactive: 'This product is no longer sold',
    outOfStock: 'This product is sold out',
    exceedsStock: ({ available, inCart }) =>
      `Only ${available} ${plural(Number(available), 'item', 'items')} left, and your cart already holds ${inCart}`,
    exceedsStockUnknown: 'That quantity is more than what is left in stock',
    addFailed: 'Could not add to the cart. Please try again.',
  },
});
