import { describe, it, expect } from 'vitest';
import {
  CHART_AMBER,
  CHART_CATEGORICAL_PALETTE,
  ORDER_STATUS_CHART_COLOR,
  categoricalColor,
  withAlpha,
} from './chartTheme';
import { ORDER_STATUSES } from '@/lib/domain/orderStatus';

describe('ORDER_STATUS_CHART_COLOR', () => {
  it('covers every order status so no arc falls back to undefined', () => {
    for (const status of ORDER_STATUSES) {
      expect(ORDER_STATUS_CHART_COLOR[status]).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});

describe('categoricalColor', () => {
  it('walks the palette in order', () => {
    expect(categoricalColor(0)).toBe(CHART_CATEGORICAL_PALETTE[0]);
    expect(categoricalColor(2)).toBe(CHART_CATEGORICAL_PALETTE[2]);
  });

  it('wraps once a series outruns the palette', () => {
    const len = CHART_CATEGORICAL_PALETTE.length;
    expect(categoricalColor(len)).toBe(CHART_CATEGORICAL_PALETTE[0]);
    expect(categoricalColor(len + 3)).toBe(CHART_CATEGORICAL_PALETTE[3]);
  });

  it('stays in bounds for a negative index', () => {
    // Plain `index % len` keeps the sign in JS and would index out of bounds.
    expect(categoricalColor(-1)).toBe(
      CHART_CATEGORICAL_PALETTE[CHART_CATEGORICAL_PALETTE.length - 1],
    );
  });
});

describe('withAlpha', () => {
  it('converts a 6-digit hex to rgba', () => {
    expect(withAlpha('#F59E0B', 0.35)).toBe('rgba(245, 158, 11, 0.35)');
  });

  it('handles pure black without dropping channels', () => {
    expect(withAlpha('#000000', 1)).toBe('rgba(0, 0, 0, 1)');
  });

  it('clamps an out-of-range alpha', () => {
    expect(withAlpha(CHART_AMBER, 4)).toBe('rgba(245, 158, 11, 1)');
    expect(withAlpha(CHART_AMBER, -2)).toBe('rgba(245, 158, 11, 0)');
  });

  it('returns the input unchanged when it is not a 6-digit hex', () => {
    expect(withAlpha('rgba(1, 2, 3, 0.5)', 0.5)).toBe('rgba(1, 2, 3, 0.5)');
  });
});
