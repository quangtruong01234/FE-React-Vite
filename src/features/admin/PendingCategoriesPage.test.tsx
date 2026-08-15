import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import PendingCategoriesPage from './PendingCategoriesPage';
import type { PendingCategory } from '@/types';

const getPendingCategories = vi.fn<() => Promise<PendingCategory[]>>();

vi.mock('@/api', () => ({
  api: {
    products: {
      getPendingCategories: () => getPendingCategories(),
      reviewCategory: vi.fn(),
    },
  },
}));

function renderPage(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = (ui: ReactElement): ReactElement => (
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
  render(wrapper(<PendingCategoriesPage />));
}

const rows: PendingCategory[] = [
  { id: 1, name: 'Giày', description: 'Footwear', submittedBy: 'usr_60ccb8d381c411f1', createdAt: '2026-08-01T00:00:00.000Z' },
  { id: 2, name: 'Áo', createdAt: '2026-08-02T00:00:00.000Z' },
];

describe('PendingCategoriesPage', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getPendingCategories.mockReset();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('renders one keyed row per pending category without a React key warning', async () => {
    getPendingCategories.mockResolvedValue(rows);
    renderPage();

    expect(await screen.findByText('Giày')).toBeInTheDocument();
    expect(screen.getByText('Áo')).toBeInTheDocument();

    // The rows come out of a `map` that returns a fragment: the key has to sit
    // on the fragment, otherwise React reconciles the rows by position.
    const warnings = errorSpy.mock.calls.filter((call: unknown[]) =>
      String(call[0]).includes('unique "key" prop'),
    );
    expect(warnings).toEqual([]);
  });

  it('shows the submitter id and falls back to an em dash when the field is absent', async () => {
    getPendingCategories.mockResolvedValue(rows);
    renderPage();

    expect(await screen.findByText('usr_60ccb8d381c411f1')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThan(0));
  });
});
