import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { AddressFormModal } from './AddressFormModal';

vi.mock('@/api', () => ({
  api: {
    shipping: {
      getProvinces: vi.fn(() =>
        Promise.resolve([
          { id: 201, name: 'Hà Nội' },
          { id: 202, name: 'Hồ Chí Minh' },
        ]),
      ),
      getDistricts: vi.fn(() =>
        Promise.resolve([
          { id: 1442, name: 'Quận Ba Đình' },
          { id: 1443, name: 'Quận Hoàn Kiếm' },
        ]),
      ),
      getWards: vi.fn((districtId: number) =>
        Promise.resolve(
          districtId === 1442
            ? [{ id: '20101', name: 'Phường Phúc Xá' }]
            : [{ id: '20301', name: 'Phường Hàng Bạc' }],
        ),
      ),
    },
    users: { createAddress: vi.fn(), updateAddress: vi.fn() },
  },
}));

function renderModal(): { selects: () => HTMLSelectElement[] } {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = (ui: ReactElement): ReactElement => (
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
  render(wrapper(<AddressFormModal open onClose={() => {}} />));
  return {
    selects: () => Array.from(document.querySelectorAll('select')),
  };
}

describe('<AddressFormModal> — GHN location cascade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears the ward when the district changes', async () => {
    // GHN-DIST-01: `POST /api/order/shipping-fee` now answers 400 when the ward
    // does not belong to the district, and checkout turns that 400 into a red
    // "không giao tới" banner that blocks the order. A ward left over from the
    // previously picked district would therefore block a perfectly deliverable
    // address, so the reset below is load-bearing, not cosmetic.
    const { selects } = renderModal();

    const [province, district, ward] = selects();
    await waitFor(() => expect(province.options.length).toBeGreaterThan(1));

    fireEvent.change(province, { target: { value: '201' } });
    await waitFor(() => expect(district.options.length).toBeGreaterThan(1));

    fireEvent.change(district, { target: { value: '1442' } });
    await waitFor(() => expect(ward.options.length).toBeGreaterThan(1));

    fireEvent.change(ward, { target: { value: '20101' } });
    expect(ward.value).toBe('20101');

    fireEvent.change(district, { target: { value: '1443' } });
    expect(ward.value).toBe('');
  });

  it('clears both the district and the ward when the province changes', async () => {
    const { selects } = renderModal();

    const [province, district, ward] = selects();
    await waitFor(() => expect(province.options.length).toBeGreaterThan(1));

    fireEvent.change(province, { target: { value: '201' } });
    await waitFor(() => expect(district.options.length).toBeGreaterThan(1));
    fireEvent.change(district, { target: { value: '1442' } });
    await waitFor(() => expect(ward.options.length).toBeGreaterThan(1));
    fireEvent.change(ward, { target: { value: '20101' } });

    fireEvent.change(province, { target: { value: '202' } });
    expect(district.value).toBe('');
    expect(ward.value).toBe('');
  });
});
