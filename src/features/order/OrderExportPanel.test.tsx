import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { LanguageProvider } from '@/context/LanguageContext';
import { LANG_STORAGE_KEY } from '@/lib/i18n/lang';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import { OrderExportPanel } from './OrderExportPanel';
import type { ExportJob } from '@/types';

const EXPORT_PATH = `${API_BASE}/order/seller/export`;
const ADMIN_EXPORT_PATH = `${API_BASE}/order/admin/export`;
const JOBS_PATH = `${API_BASE}/order/export/jobs`;

function csvResponse(): Response {
  return HttpResponse.text('﻿orderId,sku\r\n', {
    headers: { 'Content-Type': 'text/csv; charset=utf-8' },
  });
}

/** `?from=…&to=…` of every export request MSW saw, in order. */
function captureExportRequests(path = EXPORT_PATH): URLSearchParams[] {
  const seen: URLSearchParams[] = [];
  server.use(
    http.get(path, ({ request }) => {
      seen.push(new URL(request.url).searchParams);
      return csvResponse();
    }),
  );
  return seen;
}

function makeJob(overrides: Partial<ExportJob> = {}): ExportJob {
  return {
    id: 'exp_1',
    scope: 'seller',
    from: '2025-10-01',
    to: '2026-09-27',
    statusFilter: null,
    state: 'done',
    rowCount: 12345,
    fileName: 'trybuy-orders-2025-10-01-2026-09-27.csv',
    fileSizeBytes: 2048,
    errorMessage: null,
    createdAt: '2026-09-28T02:00:00.000Z',
    startedAt: '2026-09-28T02:00:05.000Z',
    finishedAt: '2026-09-28T02:00:09.000Z',
    expiresAt: '2026-09-29T02:00:09.000Z',
    ...overrides,
  };
}

function serveJobs(jobs: ExportJob[]): void {
  server.use(http.get(JOBS_PATH, () => HttpResponse.json({ data: jobs })));
}

/** The ISO day behind a `DateField` trigger, which reads `dd/mm/yyyy`. */
function pickedDay(label: string): string {
  const [day, month, year] = (screen.getByLabelText(label).textContent ?? '').trim().split('/');
  return `${year}-${month}-${day}`;
}

/** Moves `from` back `months` calendar pages and picks day 1. */
async function pickFromMonthsBack(months: number): Promise<void> {
  await userEvent.click(screen.getByLabelText('Từ ngày'));
  const grid = screen.getByRole('dialog');
  for (let i = 0; i < months; i += 1) {
    await userEvent.click(within(grid).getByRole('button', { name: 'Tháng trước' }));
  }
  await userEvent.click(within(grid).getByRole('button', { name: '1' }));
}

function downloadedName(): string {
  const anchor = vi.mocked(HTMLAnchorElement.prototype.click).mock
    .instances[0] as HTMLAnchorElement;
  return anchor.download;
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  // Every panel reads its job list on mount; an empty one keeps it hidden.
  serveJobs([]);
});

afterEach(() => vi.restoreAllMocks());

describe('OrderExportPanel — direct export (seller)', () => {
  it('defaults to a range inside the 90-day cap and sends it verbatim', async () => {
    const seen = captureExportRequests();
    renderWithProviders(<OrderExportPanel scope="seller" />);

    expect(screen.getByLabelText('Từ ngày')).toHaveTextContent(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(screen.getByLabelText('Đến ngày')).toHaveTextContent(/^\d{2}\/\d{2}\/\d{4}$/);

    await userEvent.click(screen.getByRole('button', { name: /Xuất CSV/ }));

    await waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0].get('from')).toBe(pickedDay('Từ ngày'));
    expect(seen[0].get('to')).toBe(pickedDay('Đến ngày'));
    // No tab active → no status param at all, rather than an empty one.
    expect(seen[0].has('status')).toBe(false);
    expect(seen[0].has('sellerId')).toBe(false);
  });

  it('carries the active status tab as ?status=', async () => {
    const seen = captureExportRequests();
    renderWithProviders(<OrderExportPanel scope="seller" status="completed" />);

    await userEvent.click(screen.getByRole('button', { name: /Xuất CSV/ }));

    await waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0].get('status')).toBe('completed');
  });

  it('downloads the csv under the backend filename', async () => {
    captureExportRequests();
    renderWithProviders(<OrderExportPanel scope="seller" />);
    const from = pickedDay('Từ ngày');
    const to = pickedDay('Đến ngày');

    await userEvent.click(screen.getByRole('button', { name: /Xuất CSV/ }));

    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
    expect(downloadedName()).toBe(`trybuy-orders-${from}-${to}.csv`);
  });

  it('sends a range picked from the calendar, not the default one', async () => {
    const seen = captureExportRequests();
    renderWithProviders(<OrderExportPanel scope="seller" />);

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

  it('surfaces the backend 400 message verbatim — it names the real row count', async () => {
    server.use(
      http.get(EXPORT_PATH, () =>
        HttpResponse.json(
          { statusCode: 400, message: 'Export window is 95 days; the maximum is 90.' },
          { status: 400 },
        ),
      ),
    );
    renderWithProviders(<OrderExportPanel scope="seller" />);

    await userEvent.click(screen.getByRole('button', { name: /Xuất CSV/ }));

    expect(
      await screen.findByText('Export window is 95 days; the maximum is 90.'),
    ).toBeInTheDocument();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    // Not a row-cap refusal → no background job on offer.
    expect(screen.queryByRole('button', { name: /Tạo file trong nền/ })).not.toBeInTheDocument();
  });

  it('clears a server error once the seller adjusts the range', async () => {
    server.use(
      http.get(EXPORT_PATH, () =>
        HttpResponse.json({ statusCode: 401, message: 'Unauthorized' }, { status: 401 }),
      ),
    );
    renderWithProviders(<OrderExportPanel scope="seller" />);

    await userEvent.click(screen.getByRole('button', { name: /Xuất CSV/ }));
    expect(
      await screen.findByText('Vui lòng đăng nhập để xuất đơn hàng.'),
    ).toBeInTheDocument();

    // Day 1 of the month the default `from` sits in: a different range, still
    // well inside the cap, so no client-side error takes its place.
    await pickFromMonthsBack(0);

    await waitFor(() =>
      expect(screen.queryByText('Vui lòng đăng nhập để xuất đơn hàng.')).not.toBeInTheDocument(),
    );
    expect(screen.queryByText(/Khoảng thời gian/)).not.toBeInTheDocument();
  });
});

describe('OrderExportPanel — background jobs (T5)', () => {
  it('turns a window over 90 days into "Tạo file trong nền" and posts the job', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(`${API_BASE}/order/seller/export/jobs`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ data: makeJob({ state: 'pending' }) }, { status: 202 });
      }),
    );
    renderWithProviders(<OrderExportPanel scope="seller" status="completed" />);

    // Four months back, day 1: over 90 days and well under 366 whatever today is.
    await pickFromMonthsBack(4);

    expect(screen.queryByRole('button', { name: /Xuất CSV/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Khoảng thời gian tối đa/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Tạo file trong nền/ }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    // The seller route answers 400 to any unknown key — `sellerId` must not ride along.
    expect(bodies[0]).toEqual({
      from: pickedDay('Từ ngày'),
      to: pickedDay('Đến ngày'),
      status: 'completed',
    });
    expect(await screen.findByText(/Đã tạo yêu cầu/)).toBeInTheDocument();
  });

  it('refuses a window over 366 days without a request', async () => {
    // No POST handler: `onUnhandledRequest: 'error'` would fail any call.
    renderWithProviders(<OrderExportPanel scope="seller" />);

    await pickFromMonthsBack(13);

    expect(screen.getByText(/Khoảng thời gian tối đa là 366 ngày/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Xuất CSV/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Tạo file trong nền/ })).not.toBeInTheDocument();
  });

  it('offers a background job when the direct export hits the row cap', async () => {
    server.use(
      http.get(EXPORT_PATH, () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: 'Export matches 7421 item rows; the maximum is 5000. Narrow the date range or filter by status.',
          },
          { status: 400 },
        ),
      ),
    );
    renderWithProviders(<OrderExportPanel scope="seller" />);

    await userEvent.click(screen.getByRole('button', { name: /Xuất CSV/ }));

    expect(await screen.findByText(/Export matches 7421 item rows/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tạo file trong nền/ })).toBeEnabled();
  });

  it('explains a 429 — three jobs already running', async () => {
    server.use(
      http.post(`${API_BASE}/order/seller/export/jobs`, () =>
        HttpResponse.json(
          { statusCode: 429, message: 'You already have 3 export jobs pending or running.' },
          { status: 429 },
        ),
      ),
    );
    renderWithProviders(<OrderExportPanel scope="seller" />);
    await pickFromMonthsBack(4);

    await userEvent.click(screen.getByRole('button', { name: /Tạo file trong nền/ }));

    expect(
      await screen.findByText('Đang có 3 file đang tạo — chờ một file xong rồi thử lại.'),
    ).toBeInTheDocument();
  });

  it('lists the jobs of this scope and downloads a finished one', async () => {
    const downloads: string[] = [];
    serveJobs([
      makeJob(),
      makeJob({ id: 'exp_2', state: 'expired', fileName: null, expiresAt: null }),
      makeJob({ id: 'exp_3', state: 'failed', rowCount: null, errorMessage: 'Export failed: too many rows' }),
      makeJob({ id: 'exp_4', scope: 'admin' }),
    ]);
    server.use(
      http.get(`${JOBS_PATH}/:id/download`, ({ params }) => {
        downloads.push(String(params.id));
        return csvResponse();
      }),
    );
    renderWithProviders(<OrderExportPanel scope="seller" />);

    const list = await screen.findByRole('list', { name: 'File đã xuất' });
    // The admin-scope job belongs on the admin panel, not here.
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(list).getAllByText('01/10/2025 – 27/09/2026')).toHaveLength(3);
    expect(within(list).getByText('Hết hạn')).toBeInTheDocument();
    expect(within(list).getByText('Export failed: too many rows')).toBeInTheDocument();
    // Only the finished job can be downloaded.
    const buttons = within(list).getAllByRole('button', { name: /Tải/ });
    expect(buttons).toHaveLength(1);

    await userEvent.click(buttons[0]);

    await waitFor(() => expect(downloads).toEqual(['exp_1']));
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
    expect(downloadedName()).toBe('trybuy-orders-2025-10-01-2026-09-27.csv');
  });

  it('tells the user to re-create a file that expired since the last poll', async () => {
    serveJobs([makeJob()]);
    server.use(
      http.get(`${JOBS_PATH}/:id/download`, () =>
        HttpResponse.json(
          { statusCode: 410, message: 'Export file has expired. Request a new export.' },
          { status: 410 },
        ),
      ),
    );
    renderWithProviders(<OrderExportPanel scope="seller" />);

    await userEvent.click(await screen.findByRole('button', { name: /Tải/ }));

    expect(await screen.findByText('File đã hết hạn — hãy tạo lại.')).toBeInTheDocument();
  });

  it('stays out of sight while the user has no jobs', async () => {
    renderWithProviders(<OrderExportPanel scope="seller" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Xuất CSV/ })).toBeEnabled());
    expect(screen.queryByText('File đã xuất')).not.toBeInTheDocument();
  });
});

describe('OrderExportPanel — admin (T4)', () => {
  it('exports the whole platform under the -all- filename', async () => {
    const seen = captureExportRequests(ADMIN_EXPORT_PATH);
    renderWithProviders(<OrderExportPanel scope="admin" />);
    const from = pickedDay('Từ ngày');
    const to = pickedDay('Đến ngày');

    await userEvent.click(screen.getByRole('button', { name: /Xuất CSV/ }));

    await waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0].has('sellerId')).toBe(false);
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
    expect(downloadedName()).toBe(`trybuy-orders-all-${from}-${to}.csv`);
  });

  it('narrows to one seller picked from the search', async () => {
    const seen = captureExportRequests(ADMIN_EXPORT_PATH);
    server.use(
      http.get(`${API_BASE}/user/search`, () =>
        HttpResponse.json({
          data: [{ id: 'usr_shop1', username: 'shopone', name: 'Shop One', avatar: null }],
        }),
      ),
    );
    renderWithProviders(<OrderExportPanel scope="admin" />);

    await userEvent.type(screen.getByLabelText('Người bán (tuỳ chọn)'), 'shop');
    await userEvent.click(await screen.findByRole('button', { name: /@shopone/ }));

    expect(screen.getByText('@shopone')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Xuất CSV/ }));

    await waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0].get('sellerId')).toBe('usr_shop1');

    // Clearing the chip goes back to every seller.
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ lọc người bán' }));
    await userEvent.click(screen.getByRole('button', { name: /Xuất CSV/ }));
    await waitFor(() => expect(seen).toHaveLength(2));
    expect(seen[1].has('sellerId')).toBe(false);
  });

  it('maps a 404 on the seller filter to "không tìm thấy người bán"', async () => {
    server.use(
      http.get(ADMIN_EXPORT_PATH, () =>
        HttpResponse.json({ statusCode: 404, message: 'User not found' }, { status: 404 }),
      ),
    );
    renderWithProviders(<OrderExportPanel scope="admin" />);

    await userEvent.click(screen.getByRole('button', { name: /Xuất CSV/ }));

    expect(await screen.findByText('Không tìm thấy người bán đã chọn.')).toBeInTheDocument();
  });

  it('posts an admin job with the seller filter', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.get(`${API_BASE}/user/search`, () =>
        HttpResponse.json({
          data: [{ id: 'usr_shop1', username: 'shopone', name: null, avatar: null }],
        }),
      ),
      http.post(`${API_BASE}/order/admin/export/jobs`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(
          { data: makeJob({ scope: 'admin', state: 'pending' }) },
          { status: 202 },
        );
      }),
    );
    renderWithProviders(<OrderExportPanel scope="admin" />);

    await userEvent.type(screen.getByLabelText('Người bán (tuỳ chọn)'), 'shop');
    await userEvent.click(await screen.findByRole('button', { name: /@shopone/ }));
    await pickFromMonthsBack(4);
    await userEvent.click(screen.getByRole('button', { name: /Tạo file trong nền/ }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({ sellerId: 'usr_shop1' });
  });
});

describe('OrderExportPanel in English', () => {
  it('translates the controls, the status hint and the job list', async () => {
    localStorage.setItem(LANG_STORAGE_KEY, 'en');
    serveJobs([makeJob({ statusFilter: 'completed' })]);
    renderWithProviders(
      <LanguageProvider>
        <OrderExportPanel scope="seller" status="delivering" />
      </LanguageProvider>,
    );

    expect(screen.getByRole('button', { name: /Export CSV/ })).toBeInTheDocument();
    expect(screen.getByText(/“Out for delivery” orders only/)).toBeInTheDocument();

    const list = await screen.findByRole('list', { name: 'Exported files' });
    expect(within(list).getByText('Ready')).toBeInTheDocument();
    expect(within(list).getByText('Completed')).toBeInTheDocument();
    expect(within(list).getByText('12,345 rows')).toBeInTheDocument();
    localStorage.removeItem(LANG_STORAGE_KEY);
  });
});
