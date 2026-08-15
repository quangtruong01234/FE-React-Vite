import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import PendingBrandsPage from './PendingBrandsPage';
import type { PendingBrand } from '@/types';

const getPendingBrands = vi.fn<() => Promise<PendingBrand[]>>();

vi.mock('@/api', () => ({
  api: {
    products: {
      getPendingBrands: () => getPendingBrands(),
      reviewBrand: vi.fn(),
    },
  },
}));

function renderPage(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = (ui: ReactElement): ReactElement => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
  render(wrapper(<PendingBrandsPage />));
}

const rows: PendingBrand[] = [
  { id: 1, name: 'Nike', description: 'Thể thao', submittedBy: 'usr_60ccb7b981c411f1', createdAt: '2026-08-01T00:00:00.000Z' },
  { id: 2, name: 'Adidas', submittedBy: null, createdAt: '2026-08-02T00:00:00.000Z' },
];

describe('PendingBrandsPage', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getPendingBrands.mockReset();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('renders one keyed row per pending brand without a React key warning', async () => {
    getPendingBrands.mockResolvedValue(rows);
    renderPage();

    expect(await screen.findByText('Nike')).toBeInTheDocument();
    expect(screen.getByText('Adidas')).toBeInTheDocument();

    // The rows come out of a `map` that returns a fragment: the key has to sit
    // on the fragment, otherwise React reconciles the rows by position.
    const warnings = errorSpy.mock.calls.filter((call: unknown[]) =>
      String(call[0]).includes('unique "key" prop'),
    );
    expect(warnings).toEqual([]);
  });

  it('shows the submitter id and falls back to an em dash when it is null', async () => {
    getPendingBrands.mockResolvedValue(rows);
    renderPage();

    expect(await screen.findByText('usr_60ccb7b981c411f1')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThan(0));
  });

  it('shows the server-error panel instead of the empty-queue row when the request fails', async () => {
    getPendingBrands.mockRejectedValue({ statusCode: 500, message: 'Internal server error' });
    renderPage();

    expect(await screen.findByText('Máy chủ gặp sự cố')).toBeInTheDocument();
    expect(screen.queryByText('Không có thương hiệu chờ duyệt.')).not.toBeInTheDocument();
  });
});
