import { describe, it, expect } from 'vitest';
import type { Variation } from '@/types';
import { cn, formatPrice, formatVnd, buildVariantLabel } from './utils';

describe('cn', () => {
  it('merges conditional classes and dedupes tailwind conflicts', () => {
    const hidden = false;
    expect(cn('px-2', hidden && 'hidden', 'px-4')).toBe('px-4');
  });
});

describe('formatPrice', () => {
  it('abbreviates millions', () => {
    expect(formatPrice(1_500_000)).toBe('1.5 triệu đ');
    expect(formatPrice(2_000_000)).toBe('2 triệu đ');
  });

  it('groups thousands below a million', () => {
    expect(formatPrice(199_000)).toBe('199.000 đ');
  });

  it('returns a dash for invalid input', () => {
    expect(formatPrice(NaN)).toBe('—');
  });

  it('coerces decimal-string money values (legacy backend responses)', () => {
    expect(formatPrice('2000.00')).toBe('2.000 đ');
    expect(formatPrice('299000.00')).toBe('299.000 đ');
    expect(formatPrice('1500000.00')).toBe('1.5 triệu đ');
  });

  it('returns a dash for non-numeric strings', () => {
    expect(formatPrice('abc')).toBe('—');
  });
});

describe('formatVnd', () => {
  it('always shows full grouped digits, never abbreviated', () => {
    expect(formatVnd(1_500_000)).toBe('1.500.000 đ');
  });

  it('coerces decimal-string money values', () => {
    expect(formatVnd('1500000.00')).toBe('1.500.000 đ');
  });

  // AUD-0816-04: call sites used to wrap the argument in `Number()`, which is
  // both redundant (the formatter already coerces strings) and harmful —
  // `Number(null)` is `0`, so a missing amount rendered as a confident "0 đ"
  // instead of the em dash that says "we don't have this value".
  it('renders a missing amount as an em dash, not 0 đ', () => {
    expect(formatVnd(null as unknown as number)).toBe('—');
    expect(formatVnd(undefined as unknown as number)).toBe('—');
    expect(formatVnd(Number(null))).toBe('0 đ');
  });
});

describe('buildVariantLabel', () => {
  const variations: Variation[] = [
    { name: 'Màu', options: ['Đỏ', 'Xanh'] },
    { name: 'Size', options: ['S', 'M'] },
  ];

  it('builds a label from a tierIdx string', () => {
    expect(buildVariantLabel('[0,1]', variations)).toBe('Đỏ / M');
  });

  it('returns null on malformed JSON', () => {
    expect(buildVariantLabel('not-json', variations)).toBeNull();
  });

  it('returns null when there are no variations', () => {
    expect(buildVariantLabel('[0]', [])).toBeNull();
  });
});
