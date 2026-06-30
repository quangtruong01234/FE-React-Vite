import { describe, it, expect } from 'vitest';
import { parseShippingAddress, formatAddressLines } from './shippingAddress';

describe('parseShippingAddress', () => {
  it('splits the 6-part GHN string into labelled fields', () => {
    const parsed = parseShippingAddress(
      'Nguyen Van A|0987654321|123 Nguyen Hue|Phuong Ben Nghe|Quan 1|Ho Chi Minh',
    );
    expect(parsed).toEqual({
      name: 'Nguyen Van A',
      phone: '0987654321',
      addressLine: '123 Nguyen Hue',
      ward: 'Phuong Ben Nghe',
      district: 'Quan 1',
      province: 'Ho Chi Minh',
    });
  });

  it('trims surrounding whitespace on each part', () => {
    const parsed = parseShippingAddress(' Test User | 0901234567 | 1 A St | Ward 1 | District 1 | HCM ');
    expect(parsed?.name).toBe('Test User');
    expect(parsed?.province).toBe('HCM');
  });

  it('returns null for an empty or missing value', () => {
    expect(parseShippingAddress('')).toBeNull();
    expect(parseShippingAddress(null)).toBeNull();
    expect(parseShippingAddress(undefined)).toBeNull();
  });

  it('returns null when the string is not the expected 6-part format', () => {
    expect(parseShippingAddress('123 Some Street, City')).toBeNull();
    expect(parseShippingAddress('a|b|c')).toBeNull();
  });
});

describe('formatAddressLines', () => {
  it('joins the address lines, skipping empty segments', () => {
    const parsed = parseShippingAddress('A|0900000000|1 A St||Quan 1|HCM');
    expect(parsed && formatAddressLines(parsed)).toBe('1 A St, Quan 1, HCM');
  });
});
