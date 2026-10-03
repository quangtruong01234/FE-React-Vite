import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { OrderTimeline } from '@/types';
import { OrderHistoryCard } from './OrderHistoryCard';

const getHistory = vi.fn<(id: string) => Promise<OrderTimeline>>();

vi.mock('@/api', () => ({
  api: { orders: { getHistory: (id: string) => getHistory(id) } },
}));

describe('OrderHistoryCard', () => {
  beforeEach(() => {
    getHistory.mockReset();
  });

  it('lists every event oldest first and tags carrier events', async () => {
    getHistory.mockResolvedValue({
      orderId: 'ord_1',
      status: 'shipped',
      events: [
        { kind: 'placed', status: 'pending', ghnStatus: null, at: '2026-10-02T10:00:00.000Z' },
        { kind: 'status', status: 'confirmed', ghnStatus: null, at: '2026-10-02T11:00:00.000Z' },
        { kind: 'shipping', status: null, ghnStatus: 'teleported', at: '2026-10-02T12:00:00.000Z' },
      ],
    });
    renderWithProviders(<OrderHistoryCard orderId="ord_1" />);

    const items = await screen.findAllByRole('listitem');
    expect(getHistory).toHaveBeenCalledWith('ord_1');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Đặt hàng');
    // Unknown GHN codes surface raw rather than disappearing.
    expect(items[2]).toHaveTextContent('teleported');
    expect(items[2]).toHaveTextContent('GHN');
    expect(items[0]).not.toHaveTextContent('GHN');
  });

  // A backend without the route answers 404 — the page must look exactly as before.
  it('renders nothing when the history route fails', async () => {
    getHistory.mockRejectedValue({ statusCode: 404, status: 404, message: 'Not Found' });
    const { container } = renderWithProviders(<OrderHistoryCard orderId="ord_1" />);

    await waitFor(() => expect(getHistory).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
