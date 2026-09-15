import { describe, it, expect } from 'vitest';
import { canSell, canAdminister, hasStaleRole, roleSatisfies, sessionRole } from './roleAccess';

describe('roleAccess', () => {
  describe('canSell', () => {
    it('is true only for the shop role', () => {
      expect(canSell('shop')).toBe(true);
    });

    it('is false for admin — admin is an operator, not a seller', () => {
      expect(canSell('admin')).toBe(false);
    });

    it.each(['user', '', null, undefined])('is false for %s', (role) => {
      expect(canSell(role)).toBe(false);
    });
  });

  describe('canAdminister', () => {
    it('is true only for the admin role', () => {
      expect(canAdminister('admin')).toBe(true);
    });

    it.each(['shop', 'user', '', null, undefined])('is false for %s', (role) => {
      expect(canAdminister(role)).toBe(false);
    });
  });

  describe('roleSatisfies', () => {
    it('allows any authenticated role when no requiredRole', () => {
      expect(roleSatisfies('user')).toBe(true);
      expect(roleSatisfies('shop')).toBe(true);
      expect(roleSatisfies('admin')).toBe(true);
    });

    it('admin route requires admin', () => {
      expect(roleSatisfies('admin', 'admin')).toBe(true);
      expect(roleSatisfies('shop', 'admin')).toBe(false);
      expect(roleSatisfies('user', 'admin')).toBe(false);
    });

    it('shop route requires seller capability and rejects admin', () => {
      expect(roleSatisfies('shop', 'shop')).toBe(true);
      expect(roleSatisfies('admin', 'shop')).toBe(false);
      expect(roleSatisfies('user', 'shop')).toBe(false);
    });
  });

  describe('sessionRole', () => {
    it('prefers the token role over the stored role — the backend enforces the token', () => {
      expect(sessionRole({ role: { name: 'shop' }, tokenRole: 'user' })).toBe('user');
    });

    it('gates a promoted-but-not-relogged user out of seller routes', () => {
      const me = { role: { name: 'shop' }, tokenRole: 'user', isRoleStale: true };

      expect(roleSatisfies(sessionRole(me), 'shop')).toBe(false);
      // Proof this is the bug being fixed: the stored role says otherwise.
      expect(roleSatisfies(me.role.name, 'shop')).toBe(true);
    });

    it('still gates on the token after a demotion — it is what the API honours', () => {
      expect(sessionRole({ role: { name: 'user' }, tokenRole: 'shop' })).toBe('shop');
    });

    it('falls back to the stored role when tokenRole is absent', () => {
      // Two real cases: the cache seeded from the login response (token just
      // minted, so the two agree) and a gateway older than the rollout.
      expect(sessionRole({ role: { name: 'shop' } })).toBe('shop');
      expect(roleSatisfies(sessionRole({ role: { name: 'shop' } }), 'shop')).toBe(true);
    });
  });

  describe('hasStaleRole', () => {
    it('is the backend flag when present', () => {
      expect(hasStaleRole({ role: { name: 'shop' }, tokenRole: 'user', isRoleStale: true })).toBe(true);
      expect(hasStaleRole({ role: { name: 'user' }, tokenRole: 'user', isRoleStale: false })).toBe(false);
    });

    it.each([
      ['a response without the flag', { role: { name: 'shop' } }],
      ['no user at all', null],
      ['an unresolved session', undefined],
    ])('is false for %s', (_case, me) => {
      expect(hasStaleRole(me)).toBe(false);
    });
  });
});
