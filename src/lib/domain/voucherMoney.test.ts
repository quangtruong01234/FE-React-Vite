import { describe, it, expect } from 'vitest';
import { toVoucherNumber } from './voucherMoney';

describe('toVoucherNumber', () => {
  it('accepts both the decimal-string and the number form of a money column', () => {
    expect(toVoucherNumber('50000.00')).toBe(50000);
    expect(toVoucherNumber(50000)).toBe(50000);
  });

  it('falls back to 0 for null, undefined and unparseable values', () => {
    expect(toVoucherNumber(null)).toBe(0);
    expect(toVoucherNumber(undefined)).toBe(0);
    expect(toVoucherNumber('abc')).toBe(0);
  });
});
