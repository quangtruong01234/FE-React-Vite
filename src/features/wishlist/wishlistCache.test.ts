import { describe, it, expect, vi } from 'vitest';
import {
  wishlistIdSet,
  toggleWishlistId,
  collectWishlistIds,
  WISHLIST_ID_PAGE_SIZE,
  MAX_WISHLIST_ID_PAGES,
} from './wishlistCache';
import type { PaginatedResponse, WishlistItem } from '@/types';

function item(id: string): WishlistItem {
  return { id, wishlistedAt: '2026-07-09T00:00:00.000Z' } as unknown as WishlistItem;
}

function page(
  data: WishlistItem[],
  hasNext: boolean,
  pageNum = 1,
): PaginatedResponse<WishlistItem> {
  return { data, total: data.length, page: pageNum, limit: WISHLIST_ID_PAGE_SIZE, totalPages: 1, hasNext };
}

describe('wishlistIdSet', () => {
  it('builds a Set of the product ids', () => {
    const set = wishlistIdSet([item('prod_1'), item('prod_2'), item('prod_3')]);
    expect([...set].sort()).toEqual(['prod_1', 'prod_2', 'prod_3']);
  });

  it('preserves opaque product ids exactly', () => {
    const set = wishlistIdSet([item('prod_42'), item('prod_7')]);
    expect(set.has('prod_42')).toBe(true);
    expect(set.has('prod_7')).toBe(true);
  });

  it('returns an empty Set for an empty page', () => {
    expect(wishlistIdSet([]).size).toBe(0);
  });
});

describe('collectWishlistIds', () => {
  it('requests the backend-capped page size, never limit > 100', async () => {
    const fetchPage = vi.fn().mockResolvedValue(page([item('prod_1')], false));
    await collectWishlistIds(fetchPage);
    expect(fetchPage).toHaveBeenCalledWith(1, WISHLIST_ID_PAGE_SIZE);
    expect(WISHLIST_ID_PAGE_SIZE).toBeLessThanOrEqual(100);
  });

  it('stops after one page when the server reports no more', async () => {
    const fetchPage = vi.fn().mockResolvedValue(page([item('prod_1'), item('prod_2')], false));
    const ids = await collectWishlistIds(fetchPage);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect([...ids].sort()).toEqual(['prod_1', 'prod_2']);
  });

  it('pages through until hasNext is false, merging every page', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(page([item('prod_1'), item('prod_2')], true, 1))
      .mockResolvedValueOnce(page([item('prod_3'), item('prod_4')], true, 2))
      .mockResolvedValueOnce(page([item('prod_5')], false, 3));
    const ids = await collectWishlistIds(fetchPage);
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect([...ids].sort()).toEqual(['prod_1', 'prod_2', 'prod_3', 'prod_4', 'prod_5']);
  });

  it('preserves opaque ids across pages', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(page([item('prod_42')], true, 1))
      .mockResolvedValueOnce(page([item('prod_7')], false, 2));
    const ids = await collectWishlistIds(fetchPage);
    expect(ids.has('prod_42')).toBe(true);
    expect(ids.has('prod_7')).toBe(true);
  });

  it('is bounded — stops at MAX_WISHLIST_ID_PAGES even if hasNext stays true', async () => {
    const fetchPage = vi.fn().mockResolvedValue(page([item('prod_1')], true));
    await collectWishlistIds(fetchPage);
    expect(fetchPage).toHaveBeenCalledTimes(MAX_WISHLIST_ID_PAGES);
  });
});

describe('toggleWishlistId', () => {
  it('adds the id when it should become wishlisted', () => {
    const next = toggleWishlistId(new Set(['prod_1', 'prod_2']), 'prod_3', true);
    expect(next.has('prod_3')).toBe(true);
    expect(next.size).toBe(3);
  });

  it('removes the id when it should no longer be wishlisted', () => {
    const next = toggleWishlistId(new Set(['prod_1', 'prod_2', 'prod_3']), 'prod_2', false);
    expect(next.has('prod_2')).toBe(false);
    expect([...next].sort()).toEqual(['prod_1', 'prod_3']);
  });

  it('does not mutate the input set', () => {
    const original = new Set(['prod_1', 'prod_2']);
    toggleWishlistId(original, 'prod_3', true);
    expect([...original].sort()).toEqual(['prod_1', 'prod_2']);
  });

  it('is idempotent — adding an existing id or removing an absent id is a no-op', () => {
    expect([...toggleWishlistId(new Set(['prod_1']), 'prod_1', true)]).toEqual(['prod_1']);
    expect([...toggleWishlistId(new Set(['prod_1']), 'prod_9', false)]).toEqual(['prod_1']);
  });
});
