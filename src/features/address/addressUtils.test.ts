import { describe, it, expect } from 'vitest';
import {
  pickDefaultAddress,
  buildGhnShippingAddress,
  ghnLocationIds,
  formatAddressSummary,
} from './addressUtils';
import type { Address } from '@/types';

function makeAddress(overrides: Partial<Address> = {}): Address {
  return {
    id: 'addr_0000000000000001',
    userId: 'usr_0000000000000017',
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
    const a = makeAddress({ id: 'addr_0000000000000001', isDefault: false });
    const b = makeAddress({ id: 'addr_0000000000000002', isDefault: true });
    expect(pickDefaultAddress([a, b])?.id).toBe('addr_0000000000000002');
  });

  it('falls back to the first entry when none is flagged default', () => {
    const a = makeAddress({ id: 'addr_0000000000000005', isDefault: false });
    const b = makeAddress({ id: 'addr_0000000000000006', isDefault: false });
    expect(pickDefaultAddress([a, b])?.id).toBe('addr_0000000000000005');
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

describe('ghnLocationIds', () => {
  it('returns both GHN ids from a saved address', () => {
    expect(ghnLocationIds(makeAddress())).toEqual({
      toDistrictId: 1442,
      toWardCode: '20101',
    });
  });

  it('keeps a leading-zero ward code as a string', () => {
    // GHN codes like "13010" lose their zero through any numeric round-trip.
    expect(ghnLocationIds(makeAddress({ wardCode: '013010' })).toWardCode).toBe('013010');
  });

  it('trims a padded ward code', () => {
    expect(ghnLocationIds(makeAddress({ wardCode: '  20101  ' })).toWardCode).toBe('20101');
  });

  it.each([
    ['a blank ward code', { wardCode: '   ' }],
    ['a missing ward code', { wardCode: '' }],
    ['a zero district id', { districtId: 0 }],
    ['a negative district id', { districtId: -1 }],
    ['a non-integer district id', { districtId: 14.42 }],
  ])('sends neither id for %s', (_label, overrides: Partial<Address>) => {
    // The pair is all-or-nothing server-side — half of it is ignored, so a
    // partial pair must degrade to free-text resolution deliberately.
    expect(ghnLocationIds(makeAddress(overrides))).toEqual({});
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
