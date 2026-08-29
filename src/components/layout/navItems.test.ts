import { describe, it, expect } from 'vitest';
import { Home } from 'lucide-react';
import {
  chromeDestinations,
  getPrimaryNavItems,
  getAccountMenuItems,
  getRoleNavItems,
  isNavItemActive,
  SELLER_NAV_ITEMS,
  ADMIN_NAV_ITEMS,
  HEADER_ICON_ITEMS,
  NOTIFICATIONS_NAV_ITEM,
  type NavItem,
} from './navItems';

const me = { id: 'usr_abc123' };

const ROLE_CASES = [
  { name: 'guest', me: null, roles: { isSeller: false, isAdmin: false } },
  { name: 'buyer', me, roles: { isSeller: false, isAdmin: false } },
  { name: 'seller', me, roles: { isSeller: true, isAdmin: false } },
  { name: 'admin', me, roles: { isSeller: false, isAdmin: true } },
  { name: 'seller + admin', me, roles: { isSeller: true, isAdmin: true } },
] as const;

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const repeated: string[] = [];
  for (const value of values) {
    if (seen.has(value)) repeated.push(value);
    seen.add(value);
  }
  return repeated;
}

describe('chrome destinations', () => {
  it.each(ROLE_CASES)('has no two entries pointing at the same page — $name', ({ me: user, roles }) => {
    expect(duplicates(chromeDestinations(user, roles))).toEqual([]);
  });

  it('keeps notifications on the bell only, never in the rail', () => {
    expect(getPrimaryNavItems().map(i => i.to)).not.toContain(NOTIFICATIONS_NAV_ITEM.to);
    expect(chromeDestinations(me, { isSeller: false, isAdmin: false }))
      .toContain(NOTIFICATIONS_NAV_ITEM.to);
  });

  it('puts every personal page in the dropdown and none in the rail', () => {
    const account = getAccountMenuItems(me).map(i => i.to);
    expect(account).toEqual([`/profile/${me.id}`, '/orders', '/returns', '/addresses']);

    const rail = [...getPrimaryNavItems(), ...getRoleNavItems({ isSeller: true, isAdmin: true })]
      .map(i => i.to);
    for (const to of account) expect(rail).not.toContain(to);
  });

  it('leaves the product composer out of the chrome — the seller console links to it', () => {
    expect(chromeDestinations(me, { isSeller: true, isAdmin: true })).not.toContain('/sell');
  });

  it('reaches every seller and admin page on mobile, where the rail is hidden', () => {
    const dropdown = getRoleNavItems({ isSeller: true, isAdmin: true }).map(i => i.to);
    for (const item of [...SELLER_NAV_ITEMS, ...ADMIN_NAV_ITEMS]) {
      expect(dropdown).toContain(item.to);
    }
  });

  it('gives a guest no personal destinations', () => {
    const guest = chromeDestinations(null, { isSeller: false, isAdmin: false });
    expect(guest).not.toContain('/addresses');
    expect(guest).not.toContain('/orders');
    expect(guest.some(to => to.startsWith('/profile/'))).toBe(false);
  });
});

describe('isNavItemActive', () => {
  const item = (to: string, extra: Partial<NavItem> = {}): NavItem =>
    ({ icon: Home, label: to, to, ...extra });

  const feed = item('/');
  const admin = item('/admin', { exact: true });
  const shop = SELLER_NAV_ITEMS.find(i => i.to === '/shop') ?? item('/shop');

  it('lights the feed on the feed only', () => {
    expect(isNavItemActive(feed, '/')).toBe(true);
    expect(isNavItemActive(feed, '/marketplace')).toBe(false);
  });

  it('lights the seller console on the product composer it links to', () => {
    expect(isNavItemActive(shop, '/shop')).toBe(true);
    expect(isNavItemActive(shop, '/sell')).toBe(true);
    expect(isNavItemActive(shop, '/sell/prod_9xKq')).toBe(true);
  });

  it('leaves the seller console dark on a page that owns its own entry', () => {
    for (const path of ['/shop/analytics', '/sell/orders', '/sell/returns', '/sell/vouchers']) {
      expect(isNavItemActive(shop, path)).toBe(false);
    }
  });

  it('honours `exact` for a dashboard whose children are separate entries', () => {
    expect(isNavItemActive(admin, '/admin')).toBe(true);
    expect(isNavItemActive(admin, '/admin/vouchers')).toBe(false);
  });

  it('does not match a route that merely shares a prefix', () => {
    expect(isNavItemActive(item('/orders'), '/order/ord_1')).toBe(false);
    expect(isNavItemActive(item('/returns'), '/returns/rr_1')).toBe(true);
  });

  it('lights exactly one rail entry per seller/admin route', () => {
    const items = getRoleNavItems({ isSeller: true, isAdmin: true });
    for (const target of [...items.map(i => i.to), '/sell']) {
      const lit = items.filter(i => isNavItemActive(i, target));
      expect(lit).toHaveLength(1);
    }
  });

  it('lights exactly one dropdown entry per personal route', () => {
    const items = getAccountMenuItems(me);
    for (const target of items) {
      expect(items.filter(i => isNavItemActive(i, target.to)).map(i => i.to)).toEqual([target.to]);
    }
  });

  it('never lights a header icon on someone else’s page', () => {
    for (const icon of HEADER_ICON_ITEMS) {
      expect(isNavItemActive(icon, '/marketplace')).toBe(false);
    }
  });
});
