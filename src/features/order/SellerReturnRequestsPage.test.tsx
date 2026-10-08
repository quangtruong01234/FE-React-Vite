import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import SellerReturnRequestsPage from './SellerReturnRequestsPage';
import type { ReturnRequest } from '@/types';

const pending: ReturnRequest = {
  id: 'rr_aaaaaaaaaaaaaaaa',
  orderId: 'ord_aaaaaaaaaaaaaaaa',
  userId: 'usr_0000000000000001',
  reason: 'Hàng lỗi màn hình',
  status: 'pending_review',
  rejectReason: null,
  refundAmount: null,
  refundMethod: null,
  refundStatus: null,
  reviewedBy: null,
  imageUrls: [],
  createdAt: '2026-10-08T10:00:00.000Z',
  updatedAt: '2026-10-08T10:00:00.000Z',
};

let approveCalls = 0;

beforeEach(() => {
  approveCalls = 0;
  server.use(
    http.get(`${API_BASE}/order/return-requests`, () =>
      HttpResponse.json({ data: { data: [pending], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } } })),
    http.post(`${API_BASE}/order/return-requests/:id/approve`, () => {
      approveCalls += 1;
      return HttpResponse.json({ data: { ...pending, status: 'approved', refundAmount: 249000 } });
    }),
  );
});

// F30 (prod route test 2026-10-08): "Duyệt & hoàn tiền" refunded on the first click.
describe('SellerReturnRequestsPage approve', () => {
  it('asks before refunding and sends nothing when the seller backs out', async () => {
    renderWithProviders(<SellerReturnRequestsPage />, { route: '/sell/returns' });
    fireEvent.click(await screen.findByRole('button', { name: 'Duyệt & hoàn tiền' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Duyệt hoàn tiền cho yêu cầu này?')).toBeInTheDocument();
    expect(within(dialog).getByText(new RegExp(`Đơn #${pending.orderId}`))).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(approveCalls).toBe(0);
  });

  it('approves once the seller confirms', async () => {
    renderWithProviders(<SellerReturnRequestsPage />, { route: '/sell/returns' });
    fireEvent.click(await screen.findByRole('button', { name: 'Duyệt & hoàn tiền' }));

    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Duyệt & hoàn tiền' }));

    await waitFor(() => expect(approveCalls).toBe(1));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
