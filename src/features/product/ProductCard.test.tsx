import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import type { ProductWithInventory } from '@/types';
import { renderWithProviders } from '@/test/renderWithProviders';
import ProductCard from './ProductCard';

function makeProduct(overrides: Partial<ProductWithInventory> = {}): ProductWithInventory {
  return {
    id: 1,
    name: 'Bình giữ nhiệt',
    price: 199_000,
    condition: 'new',
    isFeatured: false,
    rating: 0,
    ratingCount: 0,
    viewCount: 0,
    imageUrl: null,
    imageUrls: [],
    inventory: { availableStock: 10, isLowStock: false },
    ...overrides,
  } as unknown as ProductWithInventory;
}

describe('<ProductCard>', () => {
  it('renders name and grouped price WITHOUT an add-to-cart button (SKU selection lives on the detail page)', () => {
    renderWithProviders(<ProductCard product={makeProduct()} />);
    expect(screen.getByText('Bình giữ nhiệt')).toBeInTheDocument();
    expect(screen.getByText('199.000 đ')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /thêm vào giỏ/i })).not.toBeInTheDocument();
  });

  it('shows the out-of-stock overlay at zero stock', () => {
    renderWithProviders(
      <ProductCard product={makeProduct({ inventory: { availableStock: 0, isLowStock: false } as ProductWithInventory['inventory'] })} />,
    );
    expect(screen.getByText('Hết hàng')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /thêm vào giỏ/i })).not.toBeInTheDocument();
  });

  it('puts the wishlist heart on a theme-aware chip, not the scrim (THEME-04-FU)', () => {
    // The heart is `ink-sec` / `accent-red`, which turn dark in the light theme. On the scrim
    // (dark in both themes) that was dark-on-dark; on a canvas chip it is the AA pair that
    // themeTokens.test.ts checks for every text colour on `canvas-elevated`.
    renderWithProviders(<ProductCard product={makeProduct()} />);
    const heart = screen.getByRole('button', { name: 'Thêm vào yêu thích' });
    expect(heart).toHaveClass('bg-canvas-elevated/90', 'border-bdr');
    expect(heart.className).not.toMatch(/\bbg-scrim/);
  });

  it('shows the seller province when present', () => {
    renderWithProviders(
      <ProductCard product={makeProduct({ sellerProvince: { id: 201, name: 'Hà Nội' } })} />,
    );
    expect(screen.getByText('Hà Nội')).toBeInTheDocument();
  });
});
