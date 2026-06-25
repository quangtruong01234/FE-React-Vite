import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ProductThumb } from './ProductThumb';

describe('<ProductThumb>', () => {
  it('renders an <img> when a src is provided', () => {
    renderWithProviders(<ProductThumb src="https://cdn.test/p.jpg" alt="Bình giữ nhiệt" />);
    const img = screen.getByRole('img', { name: 'Bình giữ nhiệt' });
    expect(img).toHaveAttribute('src', 'https://cdn.test/p.jpg');
  });

  it('renders a placeholder icon (never an empty <img>) when src is missing', () => {
    renderWithProviders(<ProductThumb src="" alt="Sản phẩm" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders a placeholder icon when src is null', () => {
    renderWithProviders(<ProductThumb src={null} alt="Sản phẩm" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('becomes a link to the product when `to` is set', () => {
    renderWithProviders(<ProductThumb src="https://cdn.test/p.jpg" alt="Bình" to="/product/7" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/product/7');
  });
});
