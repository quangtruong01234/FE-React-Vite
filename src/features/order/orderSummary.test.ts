import { describe, it, expect } from 'vitest';
import type { OrderItem } from '@/types';
import { orderItemsSummary, orderCoverImage } from './orderSummary';

function item(productId: number, partial: Partial<OrderItem> = {}): OrderItem {
  return { id: productId, productId, quantity: 1, price: 1000, ...partial };
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
