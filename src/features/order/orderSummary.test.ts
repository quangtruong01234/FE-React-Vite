import { describe, it, expect } from 'vitest';
import type { OrderItem } from '@/types';
import {
  orderItemsSummary,
  orderCoverImage,
  orderPriceBreakdown,
  orderVoucherLabel,
} from './orderSummary';

function item(productId: number, partial: Partial<OrderItem> = {}): OrderItem {
  return { id: productId, productId: `prod_${productId}`, quantity: 1, price: 1000, ...partial };
}

describe('orderItemsSummary', () => {
  it('shows the first product name for a single-item order', () => {
    expect(orderItemsSummary([item(1, { productName: 'Bình giữ nhiệt' })])).toBe('Bình giữ nhiệt');
  });

  it('appends a remainder count for multi-item orders', () => {
    const items = [item(1, { productName: 'Bình giữ nhiệt' }), item(2), item(2)];
    expect(orderItemsSummary(items)).toBe('Bình giữ nhiệt +2 sản phẩm khác');
  });

  it('falls back to a count when the name is missing', () => {
    expect(orderItemsSummary([item(1), item(2)])).toBe('2 sản phẩm');
  });

  it('uses a generic label for an empty order', () => {
    expect(orderItemsSummary([])).toBe('Đơn hàng');
  });

  it('speaks English with singular/plural item counts', () => {
    const named = item(1, { productName: 'Bottle' });
    expect(orderItemsSummary([named, item(2)], 'en')).toBe('Bottle +1 more item');
    expect(orderItemsSummary([named, item(2), item(3)], 'en')).toBe('Bottle +2 more items');
    expect(orderItemsSummary([item(1)], 'en')).toBe('1 item');
    expect(orderItemsSummary([item(1), item(2)], 'en')).toBe('2 items');
    expect(orderItemsSummary([], 'en')).toBe('Order');
  });
});

describe('orderCoverImage', () => {
  it('returns the first item server-enriched image', () => {
    expect(orderCoverImage([item(1, { image: 'a.jpg' })])).toBe('a.jpg');
  });

  it('returns empty string when the image is null', () => {
    expect(orderCoverImage([item(1, { image: null })])).toBe('');
  });

  it('returns empty string for an empty order', () => {
    expect(orderCoverImage([])).toBe('');
  });
});

describe('orderPriceBreakdown', () => {
  it('uses the backend subtotal and shippingFee when present', () => {
    const b = orderPriceBreakdown({
      items: [item(1, { price: 299, quantity: 1 })],
      total: 27808,
      subtotal: 299,
      shippingFee: 27509,
    });
    expect(b).toEqual({ subtotal: 299, shippingFee: 27509, discount: 0, total: 27808 });
  });

  it('prefers the backend shippingFee even when it disagrees with the derivation', () => {
    // BE shippingFee (0) wins over the derived total-subtotal+discount (100),
    // e.g. a non-shipping surcharge folded into total that must not be mislabeled.
    const b = orderPriceBreakdown({
      items: [item(1, { price: 100, quantity: 1 })],
      total: 200,
      subtotal: 100,
      shippingFee: 0,
    });
    expect(b.shippingFee).toBe(0);
  });

  it('coerces backend subtotal/shippingFee decimal strings', () => {
    const b = orderPriceBreakdown({
      items: [item(1, { price: 100, quantity: 1 })],
      total: '2500.00',
      subtotal: '2000.00' as unknown as number,
      shippingFee: '500.00' as unknown as number,
    });
    expect(b).toEqual({ subtotal: 2000, shippingFee: 500, discount: 0, total: 2500 });
  });

  it('recovers the shipping fee as total - subtotal + discount', () => {
    const b = orderPriceBreakdown({
      items: [item(1, { price: 299, quantity: 1 })],
      total: 27808,
    });
    expect(b).toEqual({ subtotal: 299, shippingFee: 27509, discount: 0, total: 27808 });
  });

  it('accounts for a discount when recovering shipping', () => {
    // subtotal 300, discount 50, total 350 => shipping = 350 - 300 + 50 = 100
    const b = orderPriceBreakdown({
      items: [item(1, { price: 100, quantity: 3 })],
      total: 350,
      discountAmount: 50,
    });
    expect(b).toEqual({ subtotal: 300, shippingFee: 100, discount: 50, total: 350 });
  });

  it('coerces decimal-string money fields', () => {
    const b = orderPriceBreakdown({
      items: [item(1, { price: '1000.00' as unknown as number, quantity: 2 })],
      total: '2500.00',
      discountAmount: '0.00',
    });
    expect(b).toEqual({ subtotal: 2000, shippingFee: 500, discount: 0, total: 2500 });
  });

  it('clamps shipping to 0 when total does not exceed the discounted subtotal', () => {
    // legacy order with no shipping folded in: total === subtotal
    const b = orderPriceBreakdown({
      items: [item(1, { price: 500, quantity: 1 })],
      total: 500,
    });
    expect(b.shippingFee).toBe(0);
  });
});

describe('orderVoucherLabel', () => {
  it('joins the shop and platform codes like the invoice does', () => {
    expect(orderVoucherLabel({ voucherCode: 'SHOPA10', platformVoucherCode: 'SALE50' })).toBe(
      'SHOPA10 + SALE50',
    );
  });

  it('shows a lone code (platform-only orders keep it in voucherCode)', () => {
    expect(orderVoucherLabel({ voucherCode: 'SALE50', platformVoucherCode: null })).toBe('SALE50');
    expect(orderVoucherLabel({ voucherCode: 'SALE50' })).toBe('SALE50');
  });

  it('is null when the order redeemed no code', () => {
    expect(orderVoucherLabel({ voucherCode: null, platformVoucherCode: null })).toBeNull();
    expect(orderVoucherLabel({})).toBeNull();
  });
});
