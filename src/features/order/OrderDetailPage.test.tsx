import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import OrderDetailPage from './OrderDetailPage';
import type { Order } from '@/types';

const order: Order = {
  id: 'ord_aaaaaaaaaaaaaaaa',
  userId: 'usr_0000000000000001',
  total: '249000',
  status: 'pending',
  paymentMethod: 'cod',
  shippingAddress: 'Load Test, 0900000000, 1 Test St, Phường Bến Nghé, Quận 1, Hồ Chí Minh',
  codAmount: 249000,
  ghnOrderCode: null,
  createdAt: '2026-09-21T21:24:57.870Z',
  items: [{ id: 1, productId: 'prod_aaaaaaaaaaaaaaaa', quantity: 1, price: 249000, productName: 'Giá đỡ laptop' }],
};

let cancelCalls = 0;

beforeEach(() => {
  cancelCalls = 0;
  server.use(
    http.get(`${API_BASE}/user/me`, () =>
      HttpResponse.json({ data: { id: order.userId, username: 'user1', email: 'u@x.vn', role: { name: 'user' } } })),
    http.get(`${API_BASE}/order/return-requests/mine`, () =>
      HttpResponse.json({ data: { data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } } })),
    http.get(`${API_BASE}/order/:id/history`, () => HttpResponse.json({ data: { events: [] } })),
    http.get(`${API_BASE}/order/:id`, () => HttpResponse.json({ data: order })),
    http.patch(`${API_BASE}/order/:id/cancel`, () => {
      cancelCalls += 1;
      return HttpResponse.json({ data: { ...order, status: 'canceled' } });
    }),
  );
});

function renderPage(): void {
  renderWithProviders(
    <Routes>
      <Route path="/order/:id" element={<OrderDetailPage />} />
    </Routes>,
    { route: `/order/${order.id}` },
  );
}

// F14 (prod route test 2026-10-08): "Hủy đơn" cancelled on the first click.
describe('OrderDetailPage cancel', () => {
  it('asks before cancelling and sends nothing when the buyer keeps the order', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Hủy đơn' }));

    expect(await screen.findByText('Hủy đơn hàng này?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Giữ đơn' }));

    await waitFor(() => expect(screen.queryByText('Hủy đơn hàng này?')).not.toBeInTheDocument());
    expect(cancelCalls).toBe(0);
  });

  it('cancels once the buyer confirms', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Hủy đơn' }));
    await screen.findByText('Hủy đơn hàng này?');

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hủy đơn' }));

    await waitFor(() => expect(cancelCalls).toBe(1));
  });
});
