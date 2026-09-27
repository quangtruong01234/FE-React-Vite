import { describe, it, expect } from 'vitest';
import { hasSales, soldCountLabel } from './railRank';

describe('hasSales', () => {
  it('is true for a row that sold at least one unit', () => {
    expect(hasSales(1)).toBe(true);
  });

  it('is false for a backfill row, which the backend sends with soldCount 0', () => {
    expect(hasSales(0)).toBe(false);
  });
});

describe('soldCountLabel', () => {
  it('labels a ranked row with its sold count', () => {
    expect(soldCountLabel(12)).toBe('Đã bán 12');
  });

  it('groups thousands the Vietnamese way', () => {
    expect(soldCountLabel(1234)).toBe('Đã bán 1.234');
  });

  it('shows nothing for a backfill row rather than "Đã bán 0"', () => {
    expect(soldCountLabel(0)).toBeNull();
  });
});
