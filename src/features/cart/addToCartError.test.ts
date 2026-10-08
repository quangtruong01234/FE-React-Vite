import { describe, it, expect } from 'vitest';
import { addToCartErrorMessage, cartAddRefusal } from './addToCartError';

const conflict = (errorCode: string, message: string) => ({ statusCode: 409, status: 409, message, errorCode });

describe('cartAddRefusal', () => {
  it('maps the three CART-STOCK-01 codes', () => {
    expect(cartAddRefusal(conflict('PRODUCT_INACTIVE', 'x'))).toBe('inactive');
    expect(cartAddRefusal(conflict('OUT_OF_STOCK', 'x'))).toBe('outOfStock');
    expect(cartAddRefusal(conflict('QUANTITY_EXCEEDS_STOCK', 'x'))).toBe('exceedsStock');
  });

  it('is null for an uncoded or unknown-code error', () => {
    expect(cartAddRefusal({ statusCode: 404, message: 'Product not found' })).toBeNull();
    expect(cartAddRefusal(conflict('SOMETHING_ELSE', 'x'))).toBeNull();
    expect(cartAddRefusal(null)).toBeNull();
    expect(cartAddRefusal('boom')).toBeNull();
  });
});

describe('addToCartErrorMessage', () => {
  it('replaces the English refusals with our copy', () => {
    expect(addToCartErrorMessage(conflict('PRODUCT_INACTIVE', 'This product is no longer available'))).toBe(
      'Sản phẩm đã ngừng bán',
    );
    expect(addToCartErrorMessage(conflict('OUT_OF_STOCK', 'This product is out of stock'))).toBe(
      'Sản phẩm đã hết hàng',
    );
  });

  it('reads the stock numbers out of the message — the 409 has no availableStock field', () => {
    const error = conflict(
      'QUANTITY_EXCEEDS_STOCK',
      'Only 5 left in stock — the cart already holds 3, so 4 more cannot be added',
    );
    expect(addToCartErrorMessage(error)).toBe('Chỉ còn 5 sản phẩm, giỏ hàng của bạn đã có 3');
    expect(addToCartErrorMessage(error, 'en')).toBe('Only 5 items left, and your cart already holds 3');
  });

  it('falls back to a number-free line when the message wording changes', () => {
    expect(addToCartErrorMessage(conflict('QUANTITY_EXCEEDS_STOCK', 'Not enough stock'))).toBe(
      'Số lượng vượt quá số hàng còn trong kho',
    );
  });

  it('passes an uncoded backend message through, and has a generic line for none', () => {
    expect(addToCartErrorMessage({ statusCode: 404, message: ' Product not found ' })).toBe('Product not found');
    expect(addToCartErrorMessage({ statusCode: 0, message: '' })).toBe(
      'Không thêm được vào giỏ hàng. Vui lòng thử lại.',
    );
    expect(addToCartErrorMessage(undefined, 'en')).toBe('Could not add to the cart. Please try again.');
  });
});
