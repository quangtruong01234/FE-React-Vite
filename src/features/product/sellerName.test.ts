import { describe, expect, it } from 'vitest';
import { SELLER_FALLBACK, sellerName } from './sellerName';

describe('sellerName', () => {
  it('prefers the shop over the brand', () => {
    expect(sellerName({ user: { id: 'usr_1', name: 'TechStore' }, brand: { id: 1, name: 'Samsung', isActive: true } })).toBe(
      'TechStore',
    );
  });

  it('falls back to the brand when the seller is gone', () => {
    expect(sellerName({ brand: { id: 1, name: 'Samsung', isActive: true } })).toBe('Samsung');
  });

  it('treats a blank name as absent rather than rendering empty space', () => {
    expect(sellerName({ user: { id: 'usr_1', name: '   ' }, brand: { id: 1, name: 'Samsung', isActive: true } })).toBe('Samsung');
  });

  // ENRICH-FAIL-01: `user == null` now means the seller is really gone, so the
  // UI must say so. Inventing a shop name here would hide a real data state —
  // the outage case it used to cover is a catchable 502/408 now.
  it('never invents a shop name when nothing resolves', () => {
    expect(sellerName({})).toBe(SELLER_FALLBACK);
    expect(sellerName({})).not.toBe('Shop Official');
  });
});
