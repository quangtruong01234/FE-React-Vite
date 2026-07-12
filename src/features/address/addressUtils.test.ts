import { describe, it, expect } from 'vitest';
import {
  pickDefaultAddress,
  buildGhnShippingAddress,
  formatAddressSummary,
} from './addressUtils';
import type { Address } from '@/types';

function makeAddress(overrides: Partial<Address> = {}): Address {
  return {
    id: 1,
    userId: 17,
    recipientName: 'Nguyễn Văn A',
    phone: '0987654321',
    addressLine: '123 Nguyễn Huệ',
    provinceId: 202,
    provinceName: 'Hồ Chí Minh',
    districtId: 1442,
    districtName: 'Quận 1',
    wardCode: '20101',
    wardName: 'Phường Bến Nghé',
    isDefault: false,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    ...overrides,
  };
}

describe('pickDefaultAddress', () => {
  it('returns null for an empty book', () => {
    expect(pickDefaultAddress([])).toBeNull();
  });

  it('prefers the address flagged isDefault over ordering', () => {
    const a = makeAddress({ id: 1, isDefault: false });
    const b = makeAddress({ id: 2, isDefault: true });
    expect(pickDefaultAddress([a, b])?.id).toBe(2);
  });

  it('falls back to the first entry when none is flagged default', () => {
    const a = makeAddress({ id: 5, isDefault: false });
    const b = makeAddress({ id: 6, isDefault: false });
    expect(pickDefaultAddress([a, b])?.id).toBe(5);
  });
});

describe('buildGhnShippingAddress', () => {
  it('joins the six parts in GHN pipe order', () => {
    expect(buildGhnShippingAddress(makeAddress())).toBe(
      'Nguyễn Văn A|0987654321|123 Nguyễn Huệ|Phường Bến Nghé|Quận 1|Hồ Chí Minh',
    );
  });

  it('strips literal pipes so the 6-part split stays exact', () => {
    const addr = makeAddress({ addressLine: '1|2 Lê Lợi', recipientName: 'A|B' });
    const parts = buildGhnShippingAddress(addr).split('|');
    expect(parts).toHaveLength(6);
    expect(parts[0]).toBe('A B');
    expect(parts[2]).toBe('1 2 Lê Lợi');
  });

  it('trims surrounding whitespace on each part', () => {
    const addr = makeAddress({ phone: '  0900000000  ' });
    expect(buildGhnShippingAddress(addr).split('|')[1]).toBe('0900000000');
  });
});

describe('formatAddressSummary', () => {
  it('joins address parts into a readable line', () => {
    expect(formatAddressSummary(makeAddress())).toBe(
      '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, Hồ Chí Minh',
    );
  });

  it('skips empty parts', () => {
    const addr = makeAddress({ wardName: '' });
    expect(formatAddressSummary(addr)).toBe(
      '123 Nguyễn Huệ, Quận 1, Hồ Chí Minh',
    );
  });
});
