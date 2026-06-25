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
  it('renders name and grouped price, with the add button enabled in stock', () => {
    renderWithProviders(<ProductCard product={makeProduct()} />);
    expect(screen.getByText('Bình giữ nhiệt')).toBeInTheDocument();
    expect(screen.getByText('199.000 đ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /thêm vào giỏ/i })).toBeEnabled();
  });

  it('shows the out-of-stock overlay and disables the add button at zero stock', () => {
    renderWithProviders(
      <ProductCard product={makeProduct({ inventory: { availableStock: 0, isLowStock: false } as ProductWithInventory['inventory'] })} />,
    );
    expect(screen.getByText('Hết hàng')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /thêm vào giỏ/i })).toBeDisabled();
  });
});
