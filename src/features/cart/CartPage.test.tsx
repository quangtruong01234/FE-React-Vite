import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import CartPage from './CartPage';
import type { ServerCart } from '@/types';

const cart: ServerCart = {
  id: 7,
  userId: 'usr_0000000000000001',
  createdAt: '2026-07-18T00:00:00Z',
  items: [
    { id: 101, cartId: 7, productId: 'prod_aaaaaaaaaaaaaaaa', skuId: null, skuTierIdx: null, quantity: 1, createdAt: '', updatedAt: '' },
    { id: 102, cartId: 7, productId: 'prod_bbbbbbbbbbbbbbbb', skuId: null, skuTierIdx: null, quantity: 2, createdAt: '', updatedAt: '' },
  ],
};

const products = [
  { id: 'prod_aaaaaaaaaaaaaaaa', name: 'Sản phẩm A', price: 1000, imageUrls: [] },
  { id: 'prod_bbbbbbbbbbbbbbbb', name: 'Sản phẩm B', price: 2000, imageUrls: [] },
];

beforeEach(() => {
  server.use(
    http.get(`${API_BASE}/cart`, () => HttpResponse.json({ data: cart })),
    http.post(`${API_BASE}/products/with-inventory/multiple`, () =>
      HttpResponse.json({ data: products }),
    ),
  );
});

describe('CartPage selection', () => {
  it('selects every item once the cart loads', async () => {
    renderWithProviders(<CartPage />);

    expect(
      await screen.findByRole('button', { name: /ĐẶT HÀNG \(2\)/ }),
    ).toBeInTheDocument();
    // select-all + 2 item checkboxes, all checked
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);
    checkboxes.forEach(cb => expect(cb).toBeChecked());
  });

  it('keeps a manual deselection (reset only fires on a cart change)', async () => {
    renderWithProviders(<CartPage />);
    await screen.findByRole('button', { name: /ĐẶT HÀNG \(2\)/ });

    const [, firstItem] = screen.getAllByRole('checkbox');
    fireEvent.click(firstItem);

    expect(
      screen.getByRole('button', { name: /ĐẶT HÀNG \(1\)/ }),
    ).toBeInTheDocument();
    expect(firstItem).not.toBeChecked();
  });
});
