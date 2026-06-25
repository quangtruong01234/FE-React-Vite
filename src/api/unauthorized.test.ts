import { describe, it, expect } from 'vitest';
import { shouldRedirectToLogin, buildLoginRedirect } from './unauthorized';

describe('shouldRedirectToLogin', () => {
  it('redirects on a 401 by default', () => {
    expect(shouldRedirectToLogin(401)).toBe(true);
    expect(shouldRedirectToLogin(401, false)).toBe(true);
  });

  it('does not redirect when the caller opts out (e.g. session probe)', () => {
    expect(shouldRedirectToLogin(401, true)).toBe(false);
  });

  it.each([200, 400, 403, 404, 500])('does not redirect on %s', (status) => {
    expect(shouldRedirectToLogin(status)).toBe(false);
  });
});

describe('buildLoginRedirect', () => {
  it('encodes the pathname into the next param', () => {
    expect(buildLoginRedirect('/orders')).toBe('/login?next=%2Forders');
  });

  it('encodes nested paths and special characters', () => {
    expect(buildLoginRedirect('/profile/12')).toBe('/login?next=%2Fprofile%2F12');
    expect(buildLoginRedirect('/sell/orders')).toBe('/login?next=%2Fsell%2Forders');
  });

  it('handles the root path', () => {
    expect(buildLoginRedirect('/')).toBe('/login?next=%2F');
  });
});
