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
});

describe('formatVnd', () => {
  it('always shows full grouped digits, never abbreviated', () => {
    expect(formatVnd(1_500_000)).toBe('1.500.000 đ');
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
