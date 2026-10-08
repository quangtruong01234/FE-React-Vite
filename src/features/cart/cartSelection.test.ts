import { describe, it, expect } from 'vitest';
import { initialCartSelection, liveCartSelection } from './cartSelection';

describe('initialCartSelection', () => {
  it('selects every line when nothing was preselected', () => {
    expect([...initialCartSelection([1, 2, 3], undefined)]).toEqual([1, 2, 3]);
    expect([...initialCartSelection([1, 2, 3], [])]).toEqual([1, 2, 3]);
  });

  it('selects only the preselected lines that are in the cart', () => {
    expect([...initialCartSelection([1, 2, 3], [3, 1, 99])]).toEqual([1, 3]);
  });

  it('falls back to every line when no preselected line is left', () => {
    expect([...initialCartSelection([1, 2], [99])]).toEqual([1, 2]);
  });
});

describe('liveCartSelection', () => {
  it('drops checked ids whose line is no longer in the cart', () => {
    expect([...liveCartSelection(new Set([1, 2, 3]), [1, 3])]).toEqual([1, 3]);
  });

  it('keeps cart order and never adds unchecked lines', () => {
    expect([...liveCartSelection(new Set([3, 1]), [1, 2, 3])]).toEqual([1, 3]);
  });

  it('is empty when nothing checked survives', () => {
    expect(liveCartSelection(new Set([9]), [1, 2]).size).toBe(0);
  });
});
