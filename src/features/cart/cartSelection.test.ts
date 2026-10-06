import { describe, it, expect } from 'vitest';
import { initialCartSelection } from './cartSelection';

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
