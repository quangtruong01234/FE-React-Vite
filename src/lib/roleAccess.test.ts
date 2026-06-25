import { describe, it, expect } from 'vitest';
import { canSell, canAdminister, roleSatisfies } from './roleAccess';

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
});
