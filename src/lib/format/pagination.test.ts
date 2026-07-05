import { describe, it, expect } from 'vitest';
import { getPageItems } from './pagination';

describe('getPageItems', () => {
  it('returns empty for non-positive totals', () => {
    expect(getPageItems(1, 0)).toEqual([]);
    expect(getPageItems(1, -3)).toEqual([]);
  });

  it('lists every page when the count fits without collapsing', () => {
    expect(getPageItems(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(getPageItems(4, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('collapses the right side near the start', () => {
    expect(getPageItems(2, 10)).toEqual([1, 2, 3, 'ellipsis-right', 10]);
  });

  it('collapses the left side near the end', () => {
    expect(getPageItems(9, 10)).toEqual([1, 'ellipsis-left', 8, 9, 10]);
  });

  it('collapses both sides in the middle', () => {
    expect(getPageItems(5, 10)).toEqual([1, 'ellipsis-left', 4, 5, 6, 'ellipsis-right', 10]);
  });

  it('respects a wider sibling count', () => {
    expect(getPageItems(5, 12, 2)).toEqual([1, 'ellipsis-left', 3, 4, 5, 6, 7, 'ellipsis-right', 12]);
  });
});
