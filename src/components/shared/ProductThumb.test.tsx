import { describe, it, expect } from 'vitest';
import { screen, fireEvent, render } from '@testing-library/react';
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

  it('falls back to the placeholder when the image fails to load', () => {
    // A deleted product destroys its Cloudinary assets (SEC-M7) while past orders
    // keep the purchase-time URL (P2-02) — that row must not render a broken image.
    renderWithProviders(<ProductThumb src="https://cdn.test/gone.jpg" alt="Đơn cũ" />);
    fireEvent.error(screen.getByRole('img', { name: 'Đơn cũ' }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it("retries a new src instead of inheriting the previous one's failure", () => {
    // Plain `render` here: `rerender` reconciles against the same root, so wrapping
    // in providers would swap the root type and remount (losing the failed state) —
    // which is exactly what this test needs to observe. No providers are needed
    // without `to`, since only that path renders a <Link>.
    const { rerender } = render(<ProductThumb src="https://cdn.test/gone.jpg" alt="Đơn cũ" />);
    fireEvent.error(screen.getByRole('img', { name: 'Đơn cũ' }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();

    rerender(<ProductThumb src="https://cdn.test/ok.jpg" alt="Đơn mới" />);
    expect(screen.getByRole('img', { name: 'Đơn mới' })).toBeInTheDocument();
  });

  it('becomes a link to the product when `to` is set', () => {
    renderWithProviders(<ProductThumb src="https://cdn.test/p.jpg" alt="Bình" to="/product/7" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/product/7');
  });
});
