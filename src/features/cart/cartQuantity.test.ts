import { describe, expect, it } from 'vitest';
import { MAX_CART_LINE_QUANTITY, canIncreaseCartLine } from './cartQuantity';

describe('canIncreaseCartLine', () => {
  it('matches the backend cap of 999 units per line', () => {
    expect(MAX_CART_LINE_QUANTITY).toBe(999);
  });

  it('allows an increase below the cap', () => {
    expect(canIncreaseCartLine(1)).toBe(true);
    expect(canIncreaseCartLine(998)).toBe(true);
  });

  it('blocks an increase at or above the cap', () => {
    expect(canIncreaseCartLine(999)).toBe(false);
    expect(canIncreaseCartLine(1000)).toBe(false);
  });
});
