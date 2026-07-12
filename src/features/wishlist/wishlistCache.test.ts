import { describe, it, expect } from 'vitest';
import { wishlistIdSet, toggleWishlistId } from './wishlistCache';
import type { WishlistItem } from '@/types';

function item(id: number | string): WishlistItem {
  return { id, wishlistedAt: '2026-07-09T00:00:00.000Z' } as unknown as WishlistItem;
}

describe('wishlistIdSet', () => {
  it('builds a Set of the product ids', () => {
    const set = wishlistIdSet([item(1), item(2), item(3)]);
    expect([...set].sort()).toEqual([1, 2, 3]);
  });

  it('coerces string bigint ids from the backend to numbers', () => {
    const set = wishlistIdSet([item('42'), item('7')]);
    expect(set.has(42)).toBe(true);
    expect(set.has(7)).toBe(true);
    // A string key must not linger alongside the number key.
    expect(set.has('42' as unknown as number)).toBe(false);
  });

  it('returns an empty Set for an empty page', () => {
    expect(wishlistIdSet([]).size).toBe(0);
  });
});

describe('toggleWishlistId', () => {
  it('adds the id when it should become wishlisted', () => {
    const next = toggleWishlistId(new Set([1, 2]), 3, true);
    expect(next.has(3)).toBe(true);
    expect(next.size).toBe(3);
  });

  it('removes the id when it should no longer be wishlisted', () => {
    const next = toggleWishlistId(new Set([1, 2, 3]), 2, false);
    expect(next.has(2)).toBe(false);
    expect([...next].sort()).toEqual([1, 3]);
  });

  it('does not mutate the input set', () => {
    const original = new Set([1, 2]);
    toggleWishlistId(original, 3, true);
    expect([...original].sort()).toEqual([1, 2]);
  });

  it('is idempotent — adding an existing id or removing an absent id is a no-op', () => {
    expect([...toggleWishlistId(new Set([1]), 1, true)]).toEqual([1]);
    expect([...toggleWishlistId(new Set([1]), 9, false)]).toEqual([1]);
  });
});
