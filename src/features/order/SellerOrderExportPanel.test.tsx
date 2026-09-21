import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import { SellerOrderExportPanel } from './SellerOrderExportPanel';

const EXPORT_PATH = `${API_BASE}/order/seller/export`;

/** `?from=…&to=…` of every export request MSW saw, in order. */
function captureExportRequests(): URLSearchParams[] {
  const seen: URLSearchParams[] = [];
  server.use(
    http.get(EXPORT_PATH, ({ request }) => {
      seen.push(new URL(request.url).searchParams);
      return HttpResponse.text('﻿orderId,sku\r\n', {
        headers: { 'Content-Type': 'text/csv; charset=utf-8' },
      });
    }),
  );
  return seen;
}

/** The ISO day behind a `DateField` trigger, which reads `dd/mm/yyyy`. */
function pickedDay(label: string): string {
  const [day, month, year] = (screen.getByLabelText(label).textContent ?? '').trim().split('/');
  return `${year}-${month}-${day}`;
}

describe('SellerOrderExportPanel', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('defaults to a range inside the 90-day cap and sends it verbatim', async () => {
    const seen = captureExportRequests();
    renderWithProviders(<SellerOrderExportPanel />);

    expect(screen.getByLabelText('Từ ngày')).toHaveTextContent(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(screen.getByLabelText('Đến ngày')).toHaveTextContent(/^\d{2}\/\d{2}\/\d{4}$/);

    await userEvent.click(screen.getByRole('button', { name: /Xuất CSV/ }));

    await waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0].get('from')).toBe(pickedDay('Từ ngày'));
    expect(seen[0].get('to')).toBe(pickedDay('Đến ngày'));
    // No tab active → no status param at all, rather than an empty one.
    expect(seen[0].has('status')).toBe(false);
  });

  it('carries the active status tab as ?status=', async () => {
    const seen = captureExportRequests();
    renderWithProviders(<SellerOrderExportPanel status="completed" />);

    await userEvent.click(screen.getByRole('button', { name: /Xuất CSV/ }));

    await waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0].get('status')).toBe('completed');
  });

  it('downloads the csv under the backend filename', async () => {
    captureExportRequests();
    renderWithProviders(<SellerOrderExportPanel />);
    const from = pickedDay('Từ ngày');
    const to = pickedDay('Đến ngày');

    await userEvent.click(screen.getByRole('button', { name: /Xuất CSV/ }));

    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
    const anchor = vi.mocked(HTMLAnchorElement.prototype.click).mock
      .instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe(`trybuy-orders-${from}-${to}.csv`);
  });

  it('sends a range picked from the calendar, not the default one', async () => {
    const seen = captureExportRequests();
    renderWithProviders(<SellerOrderExportPanel />);

    await userEvent.click(screen.getByLabelText('Từ ngày'));
    const grid = screen.getByRole('dialog');
    await userEvent.click(within(grid).getByRole('button', { name: 'Tháng trước' }));
    const header = within(grid).getByText(/^Tháng \d+ \d{4}$/).textContent ?? '';
    const [month, year] = header.replace('Tháng ', '').split(' ');
    await userEvent.click(within(grid).getByRole('button', { name: '15' }));

    const expected = `${year}-${month.padStart(2, '0')}-15`;
    expect(pickedDay('Từ ngày')).toBe(expected);

    await userEvent.click(screen.getByRole('button', { name: /Xuất CSV/ }));

    await waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0].get('from')).toBe(expected);
  });

  it('fires no request when the window is over the cap — MSW would throw on one', async () => {
    // No handler registered: `onUnhandledRequest: 'error'` makes any call fail.
    renderWithProviders(<SellerOrderExportPanel />);

    // Four months back from the default `from`, day 1, is over 90 days before
    // today whatever today happens to be.
    await userEvent.click(screen.getByLabelText('Từ ngày'));
    const grid = screen.getByRole('dialog');
    for (let i = 0; i < 4; i += 1) {
      await userEvent.click(within(grid).getByRole('button', { name: 'Tháng trước' }));
    }
    await userEvent.click(within(grid).getByRole('button', { name: '1' }));

    expect(screen.getByText(/Khoảng thời gian tối đa là 90 ngày/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Xuất CSV/ })).toBeDisabled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('surfaces the backend 400 message verbatim — it names the real row count', async () => {
    server.use(
      http.get(EXPORT_PATH, () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: 'Export matches 7421 item rows; the maximum is 5000.',
          },
          { status: 400 },
        ),
      ),
    );
    renderWithProviders(<SellerOrderExportPanel />);

    await userEvent.click(screen.getByRole('button', { name: /Xuất CSV/ }));

    expect(
      await screen.findByText('Export matches 7421 item rows; the maximum is 5000.'),
    ).toBeInTheDocument();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('clears a server error once the seller adjusts the range', async () => {
    server.use(
      http.get(EXPORT_PATH, () =>
        HttpResponse.json({ statusCode: 401, message: 'Unauthorized' }, { status: 401 }),
      ),
    );
    renderWithProviders(<SellerOrderExportPanel />);

    await userEvent.click(screen.getByRole('button', { name: /Xuất CSV/ }));
    expect(
      await screen.findByText('Vui lòng đăng nhập để xuất đơn hàng.'),
    ).toBeInTheDocument();

    // Day 1 of the month the default `from` sits in: a different range, still
    // well inside the cap, so no client-side error takes its place.
    await userEvent.click(screen.getByLabelText('Từ ngày'));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: '1' }),
    );

    await waitFor(() =>
      expect(screen.queryByText('Vui lòng đăng nhập để xuất đơn hàng.')).not.toBeInTheDocument(),
    );
    expect(screen.queryByText(/Khoảng thời gian/)).not.toBeInTheDocument();
  });
});
