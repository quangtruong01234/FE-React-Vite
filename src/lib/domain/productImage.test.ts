import { describe, it, expect } from 'vitest';
import { productCoverImage } from './productImage';

describe('productCoverImage', () => {
  it('returns the first entry of imageUrls', () => {
    expect(productCoverImage({ imageUrls: ['https://cdn/a.png', 'https://cdn/b.png'] })).toBe(
      'https://cdn/a.png',
    );
  });

  it('skips blank entries instead of emitting an empty src', () => {
    expect(productCoverImage({ imageUrls: ['', '   ', 'https://cdn/c.png'] })).toBe(
      'https://cdn/c.png',
    );
  });

  it('returns null when the product has no image', () => {
    expect(productCoverImage({ imageUrls: null })).toBeNull();
    expect(productCoverImage({ imageUrls: [] })).toBeNull();
    expect(productCoverImage({})).toBeNull();
    expect(productCoverImage({ imageUrls: ['  '] })).toBeNull();
  });

  it('returns null for a missing product (cart row whose product did not load)', () => {
    expect(productCoverImage(undefined)).toBeNull();
    expect(productCoverImage(null)).toBeNull();
  });

  it('reads the shape the backend actually sends (no singular imageUrl)', () => {
    // Shape probed from GET /api/products/trending on 2026-09-25.
    const trending = {
      id: 'prod_ffc7ef7c81d211f1',
      imageUrls: ['https://picsum.photos/seed/JBL-FLIP6-BLU/800/800'],
    };
    expect(productCoverImage(trending)).toBe('https://picsum.photos/seed/JBL-FLIP6-BLU/800/800');
  });
});
